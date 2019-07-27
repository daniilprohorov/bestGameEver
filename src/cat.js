const jumpVelocityConst      = -20;
const jumpVelocityWallsConst = -18;
const catSensorBottowWidth   = 10;
const catSensorSide          = 20;
const xMaxVelocity           = 7;
const xForce                 = 0.1;


class Cat {
  constructor(scene, x, y, tag) {
    this.scene = scene;

    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, tag, 0);

    // The player's body is going to be a compound body that looks something like this:
    //
    //                  A = main body
    //
    //                   +---------+
    //                   |         |
    //                 +-+         +-+
    //       B = left  | |         | |  C = right
    //    wall sensor  |B|    A    |C|  wall sensor
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
    const mainBody = Bodies.rectangle(0, 0, w, h, { chamfer: { radius: 20 } });
    this.sensors = {
      bottom: Bodies.rectangle(0, h*0.5, w*0.85, catSensorBottowWidth, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.5, 0, catSensorSide, h*0.7 , { isSensor: true }),
      right: Bodies.rectangle(w * 0.5, 0, catSensorSide, h*0.7, { isSensor: true })
    };
    const compoundBody = Body.create({
      parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
      frictionStatic: 0,
      frictionAir: 0.02,
      friction: 0.01
    });
    this.sprite
      .setExistingBody(compoundBody)
	  .setFixedRotation() // Sets inertia to infinity so the player can't rotate
      .setPosition(x, y);

    // Track which sensors are touching something
    this.isTouching = { left: false, right: false, ground: false };

    // Before matter's update, reset our record of which surfaces the player is touching.
    scene.matter.world.on("beforeupdate", this.resetTouching, this);
	
	this.canJump = true;
    this.jumpCooldownTimer = null;


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

    // Track the keys
    const { LEFT, RIGHT, UP, A, D, W, SPACE } = Phaser.Input.Keyboard.KeyCodes;
    this.leftInput = new MultiKey(scene, [LEFT, A]);
    this.rightInput = new MultiKey(scene, [RIGHT, D]);
    this.jumpInput = new MultiKey(scene, [UP, W, SPACE]);

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
    if (bodyA === this.sensors.left) {
      this.isTouching.left = true;
      if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    } else if (bodyA === this.sensors.right) {
      this.isTouching.right = true;
      if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
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

    const sprite = this.sprite;
    const velocity = sprite.body.velocity;
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown = this.leftInput.isDown();
    const isJumpKeyDown = this.jumpInput.isDown();
    const isOnGround = this.isTouching.ground;
    const isOnLeft = this.isTouching.left;
    const isOnRight = this.isTouching.right;
    const isInAir = !isOnGround;

    // --- Move the player horizontally ---
    if (isLeftKeyDown) {
        if(isJumpKeyDown && isOnRight){
            sprite.setVelocityY(jumpVelocityWallsConst);
        }
        sprite.applyForce({ x: -xForce, y: 0 });
    } else if (isRightKeyDown) {
        if(isJumpKeyDown && isOnLeft){
            sprite.setVelocityY(jumpVelocityWallsConst);
        }
        sprite.applyForce({ x: xForce, y: 0 });
    }

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if (velocity.x > xMaxVelocity) sprite.setVelocityX(xMaxVelocity);
    else if(velocity.x < -xMaxVelocity) sprite.setVelocityX(-xMaxVelocity);




    // --- Move the player vertically ---

	if (isJumpKeyDown && this.canJump && isOnGround) {
	    sprite.setVelocityY(jumpVelocityConst);
		this.canJump = false;
		this.jumpCooldownTimer = this.scene.time.addEvent({
		    delay: 250,
			callback: () => (this.canJump = true)
		});
	}
    // if (isJumpKeyDown && isOnGround) {
      // sprite.setVelocityY(jumpVelocityConst);
    // }

    // Update the animation/texture based on the state of the player's state
  }

  destroy() {}
}

