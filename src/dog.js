
const DOG_JUMP_VELOCITY      = -17;
const DOG_WALL_JUMP_VELOCITY = -12;
const DOG_SENSOR_BOTTOM_WIDTH      = 10;
const DOG_SENSOR_SIDE_WIDTH             = 600;
const DOG_X_MAX_VELOCITY           = 7;
const DOG_X_FORCE                 = 0.05;

class Dog {

  player                 = null

  constructor(scene, x, y, tag, player) {
    this.scene = scene;
    this.player = player;
    
    // const anims = scene.anims;
    // anims.create({
    //     key: 'left',
    //     frames: anims.generateFrameNumbers(tag, { start: 9, end: 17}),
    //     frameRate: 18,
    //     repeat: -1
    // });
    // anims.create({
    //     key: 'right',
    //     frames: anims.generateFrameNumbers(tag, { start: 0, end: 8 }), frameRate: 18,
    //     repeat: -1
    // });

    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, tag, 0);

    // The player's body is going to be a compound body that looks something like this:
    //
    //                  A = main body
    // +---------+ |         |
    //                 +-+         +-+
    //                 | |         | |  B = right
    //                 | |    A    |B|  wall sensor
    //                 | |         | |
    //                 +-+         +-+
    //                   |         |
    //                   +-+-----+-+
    //                     |  D  |
    //                     +-----+
    //
    //                D = ground sensor
    //
    // The main body is what collides with the world. The sensors are used to determine if the
    // player is blocked by a wall or standing on the ground.

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    const mainBody = Bodies.rectangle(0, 0, w, h, { chamfer: { radius: h*0.4 } });
    
    // const mainBody1 = Bodies.circle(-w/4, 0, h*0.5);
    // const mainBody2 = Bodies.circle(+w/4, 0, h*0.5);
    this.sensors = {
      bottom: Bodies.rectangle(0, h*0.5, w*0.8, this.DOG_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
      left: Bodies.rectangle(-w*2, 0, this.DOG_SENSOR_SIDE_WIDTH, h*0.7 , { isSensor: true }),
      right: Bodies.rectangle(w*2 , 0, this.DOG_SENSOR_SIDE_WIDTH, h*0.7, { isSensor: true })
    };
    const compoundBody = Body.create({
      parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
      frictionStatic: 0.1,
      frictionAir: 0.01,
      friction: 0.02,
      mass: 45
    });
    this.sprite
      .setExistingBody(compoundBody)
	  .setFixedRotation() // Sets inertia to infinity so the player can't rotate
      .setPosition(x, y);

    // Track which sensors are touching something
    this.isTouching = { left: false, right: false, ground: false };

    // Before matter's update, reset our record of which surfaces the player is touching.
    scene.matter.world.on("beforeupdate", this.resetTouching, this);
    
    // flag to be able to go up to wall
    this.jumpToWall = true;


    scene.matterCollision.addOnCollideStart({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
      callback: this.onSensorCollide,
      context: this
    });
    // scene.matterCollision.addOnCollideStart({
    //   objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
    //   objectB: this.player.body.parts,
    //   callback: function (){console.log("kek");},
    //   context: this
    // });
    // scene.matterCollision.addOnCollideActive({
    //   objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right],
    //   objectB: this.player.body.parts,
    //   callback: function (){console.log("kek");},
    //   context: this
    // });

    this.scene.events.on("update", this.update, this);
  }

  onSensorCollide({ bodyA, bodyB, pair }) {
    // Watch for the player colliding with walls/objects on either side and the ground below, so
    // that we can use that logic inside of update to move the player.
    // Note: we are using the "pair.separation" here. That number tells us how much bodyA and bodyB
    // overlap. We want to teleport the sprite away from walls just enough so that the player won't
    // be able to press up against the wall and use friction to hang in midair. This formula leaves
    // 0.5px of overlap with the sensor so that the sensor will stay colliding on the next tick if
    // the player doesn't move.
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    if (this.player.body.parts.some( x => {return x === bodyB;})) {
        console.log("GAME OVER");
    } else if (bodyA === this.sensors.left) {
      this.isTouching.left = true;
      // if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    } else if (bodyA === this.sensors.right) {
      this.isTouching.right = true;
      // if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    } else if (bodyA === this.sensors.bottom) {
      this.isTouching.ground = true;
    }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
  }

  freeze() {
    this.sprite.setStatic(true);
  }
    
  update() {
    if (this.destroyed) return;
    // сonst vals section
    const sprite         = this.sprite;
    const velocity       = sprite.body.velocity;
    const speed          = sprite.body.speed;
    const x              = sprite.x;
    const isOnGround     = this.isTouching.ground;
    const isOnLeft       = this.isTouching.left;
    const isOnRight      = this.isTouching.right;

    const isInAir = !isOnGround;



    // console.log(sprite.anims.currentFrame);



    // --- Move the enemy horizontally ---

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if (velocity.x > this.DOG_X_MAX_VELOCITY) sprite.setVelocityX(this.DOG_X_MAX_VELOCITY);
    else if(velocity.x < -this.DOG_X_MAX_VELOCITY) sprite.setVelocityX(-this.DOG_X_MAX_VELOCITY);


    if (x > this.player.x) {
        sprite.applyForce({ x: -this.DOG_X_FORCE, y: 0 });
    }
    if (x < this.player.x) {
        sprite.applyForce({ x: this.DOG_X_FORCE, y: 0 });
    }
    if (isOnGround && (isOnLeft || isOnRight) ) {
        sprite.setVelocityY(DOG_JUMP_VELOCITY);
    }




  }

  destroy() {}
}

