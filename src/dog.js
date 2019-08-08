
const DOG_JUMP_VELOCITY       = -17;
const DOG_WALL_JUMP_VELOCITY  = -12;
const DOG_SENSOR_BOTTOM_WIDTH = 10;
const DOG_SENSOR_SIDE_WIDTH   = 600;
const DOG_X_MAX_VELOCITY      = 7;
const DOG_X_FORCE             = 0.05;

wasOnGround = false;
stop = false
class Dog {

  player = null;
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
    //                   |         |5
    //                   +-+-----+-+
    //                     |  D  |
    //                     +-----+
    //
    //                D = ground sensor
    //
    // The main body is what collides with the world. The sensors are used to determine if the
    // player is blocked by a wall or standing on the ground.
    const sensorR = 20;
    const stepH = sensorR * 4;
    const stepW = sensorR * 4;
    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
    const width = w*8; 
    const height = w*8; 
    const mainBody = Bodies.rectangle((width-stepH)/2, (height-stepW)/2, w, h, { chamfer: { radius: h*0.4 } });
    
    // sensors for neural network
    this.sensors = [];
    for ( let y = 0; y < height; y += stepH) {
        for ( let x = 0; x < width; x += stepW) {
            this.sensors.push(Bodies.circle( x, y, sensorR, {isSensor : true}));
        }
        
    }
    const compoundBody = Body.create({
      parts: [mainBody].concat(this.sensors),
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
      objectA: this.sensors,
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: this.sensors,
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideStart({
      objectA: mainBody,
      callback: this.onDogCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: mainBody,
      callback: this.onDogCollide,
      context: this
    });
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

    // if (this.player.body.parts.some( x => {return x === bodyA && bodyA.collisionFilter != 10;})) {
        // console.log(bodyA);
        // console.log("GAME OVER");
    // }
      //
    //   else if (bodyA === this.sensors.left) {
    //   this.isTouching.left = true;
    //   // if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    // } else if (bodyA === this.sensors.right) {
    //   this.isTouching.right = true;
    //   // if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    // } else if (bodyA === this.sensors.bottom) {
    //   this.isTouching.ground = true;
    // } else if (bodyA === this.sensors.leftIsGround) {
    //   this.isTouching.leftIsGround = true;
    // } else if (bodyA === this.sensors.rightIsGround) {
    //   this.isTouching.rightIsGround = true;
    // } else if (bodyA === this.sensors.underGround) {
    //   this.isTouching.underGround = true;
    // }
  }
  onDogCollide({ bodyA, bodyB, pair }) {
    // Watch for the player colliding with walls/objects on either side and the ground below, so
    // that we can use that logic inside of update to move the player.
    // Note: we are using the "pair.separation" here. That number tells us how much bodyA and bodyB
    // overlap. We want to teleport the sprite away from walls just enough so that the player won't
    // be able to press up against the wall and use friction to hang in midair. This formula leaves
    // 0.5px of overlap with the sensor so that the sensor will stay colliding on the next tick if
    // the player doesn't move.
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    if (this.player.body.parts.some( x => {return x === bodyB})) {
        console.log(bodyB);
        console.log("GAME OVER");
    } 
    //   else if (bodyA === this.sensors.left) {
    //   this.isTouching.left = true;
    //   // if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    // } else if (bodyA === this.sensors.right) {
    //   this.isTouching.right = true;
    //   // if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    // } else if (bodyA === this.sensors.bottom) {
    //   this.isTouching.ground = true;
    // } else if (bodyA === this.sensors.leftIsGround) {
    //   this.isTouching.leftIsGround = true;
    // } else if (bodyA === this.sensors.rightIsGround) {
    //   this.isTouching.rightIsGround = true;
    // } else if (bodyA === this.sensors.underGround) {
    //   this.isTouching.underGround = true;
    // }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
    this.isTouching.leftIsGround = false;
    this.isTouching.rightIsGround = false;
    this.isTouching.underGround = false;
  }

  freeze() {
    this.sprite.setStatic(true);
  }
    
  update() {
    if (this.destroyed) return;
    // сonst vals section
    const sprite          = this.sprite;
    const velocity        = sprite.body.velocity;
    const speed           = sprite.body.speed;
    const x               = sprite.x;
    const isOnGround      = this.isTouching.ground;
    const isOnLeft        = this.isTouching.left;
    const isOnRight       = this.isTouching.right;
    const isOnLeftGround  = this.isTouching.leftIsGround;
    const isOnRightGround = this.isTouching.rightIsGround;
    const isOnUnderGround = this.isTouching.underGround;

    const isInAir = !isOnGround;



    // console.log(sprite.anims.currentFrame);



    // --- Move the enemy horizontally ---

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
      //
    if (velocity.x > DOG_X_MAX_VELOCITY) sprite.setVelocityX(DOG_X_MAX_VELOCITY);
    else if(velocity.x < -DOG_X_MAX_VELOCITY) sprite.setVelocityX(-DOG_X_MAX_VELOCITY);


    // if (x > this.player.x && isOnLeft && isOnGround && isOnLeftGround) {
    //     sprite.setVelocityY(DOG_JUMP_VELOCITY);
    // } else if (x < this.player.x && isOnRight && isOnGround && isOnRightGround) {
    //     sprite.setVelocityY(DOG_JUMP_VELOCITY);
    // } else if (x > this.player.x && isOnLeft && isOnLeftGround ) {
    //     sprite.applyForce({ x: -DOG_X_FORCE, y: 0 });
    //     sprite.setVelocityY(0);
    // } else if (x < this.player.x && isOnRight && isOnRightGround ) {
    //     sprite.setVelocityY(0);
    //     sprite.applyForce({ x: DOG_X_FORCE, y: 0 });
    if (!stop) { 
        if (x > this.player.x && (isOnLeftGround || !isOnLeft)) {
            sprite.applyForce({ x: -DOG_X_FORCE, y: 0 });
        } else if (x < this.player.x && (isOnRightGround || !isOnRight)) {
            sprite.applyForce({ x: DOG_X_FORCE, y: 0 });
        } else if (x > this.player.x && !isOnLeftGround && isOnLeft) {
            sprite.setVelocityX(0);
            stop = true;
        } else if (x < this.player.x && !isOnRightGround && isOnRight) {
            sprite.setVelocityX(0);
            stop = true;
        }
        if (isOnGround && (isOnLeft || isOnRight) && (isOnLeftGround || isOnRightGround)) {
            sprite.setVelocityY(DOG_JUMP_VELOCITY);
        }
        console.log('lol');
    }
    else {
        console.log('kek');
        if ( isOnGround ) { wasOnGround = true; }
        // if ( isOnGround ) {
        //
        //     console.log('kek');
        //     this.wasOnGround = true;
        //     console.log(this.wasOnGround);
        //     sprite.setVelocityY(DOG_JUMP_VELOCITY);
        //     if (x > this.player.x) {
        //         sprite.applyForce({ x: -DOG_X_FORCE, y: 0 });
        //     } else if (x < this.player.x) {
        //         sprite.applyForce({ x: DOG_X_FORCE, y: 0 });
        //     }
        // }
        if ( wasOnGround ) {
            sprite.setVelocityY(DOG_JUMP_VELOCITY);
            if (x > this.player.x) {
                sprite.applyForce({ x: -5, y: 0 });
            } else if (x < this.player.x) {
                sprite.applyForce({ x: 5, y: 0 });
            }
            stop = false;
        }

    }
    // if (isOnGround) {
    //     this.stop = false;
    // }
    // console.log(sprite.body.position);
  }

  destroy() {}
}

