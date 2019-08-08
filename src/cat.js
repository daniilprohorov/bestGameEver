const    CAT_JUMP_VELOCITY        = -17;
const    CAT_WALL_JUMP_VELOCITY   = -12;
const    CAT_SENSOR_BOTTOM_WIDTH  = 12;
const    CAT_SENSOR_SIDE_WIDTH    = 20;
const    CAT_X_MAX_VELOCITY       = 10;
const    CAT_X_FORCE              = 0.1;
const    CAT_WALL_JUMP_Y_VELOCITY = 5;
const    CAT_JUMP_ANIM_COUNT      = 20;
const    CAT_JUMP_ANIM_FRAMES     = [...Array(CAT_JUMP_ANIM_COUNT + 1).keys()].map( x => x*(Math.abs(CAT_JUMP_VELOCITY)/8.5) + CAT_JUMP_VELOCITY );

class Cat {
  isRight = true;
  constructor(scene, x, y, tag) {
    this.scene = scene;
    this.tag   = tag;
    
    const anims = scene.anims;
    anims.create({
        key: 'leftRun',
        frames: anims.generateFrameNumbers(tag, { start: 0, end: 8 }),
        frameRate: 18,
        repeat: -1
    });
    anims.create({
        key: 'rightRun',
        frames: anims.generateFrameNumbers(tag, { start: 10, end: 18}),
        frameRate: 18,
        repeat: -1
    });
    anims.create({
        key: 'leftWalk',
        frames: anims.generateFrameNumbers(tag, { start: 20, end: 24 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'rightWalk',
        frames: anims.generateFrameNumbers(tag, { start: 30, end: 34}),
        frameRate: 10,
        repeat: -1
    });
    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, tag);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;
      
    const mainBody1 = Bodies.circle(-w/5, h*0.25, h*0.25);
    const mainBody2 = Bodies.circle(+w/5, h*0.25, h*0.25);
    this.sensors = {
      bottom: Bodies.rectangle(0, h*0.5, w*0.5, CAT_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
      left: Bodies.rectangle(-w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2 , { isSensor: true }),
      right: Bodies.rectangle(w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2, { isSensor: true }),
      kostyl: Bodies.rectangle(0, -h*0.75, 10, 10, { isSensor: true }),
      afterJumpR: Bodies.circle(w*0.4, h*0.55, 25, { isSensor: true}),
      afterJumpL: Bodies.circle(-w*0.4, h*0.55, 25, { isSensor: true})
    };

      const compoundBody = Body.create({
      parts: [mainBody1, mainBody2, this.sensors.bottom, this.sensors.left, this.sensors.right, this.sensors.kostyl, this.sensors.afterJumpR, this.sensors.afterJumpL],
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
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sensors.afterJumpR, this.sensors.afterJumpL],
      callback: this.onSensorCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sensors.afterJumpR, this.sensors.afterJumpL],
      callback: this.onSensorCollide,
      context: this
    });

    // Track the keys
    const { LEFT, RIGHT, UP, A, D, W, SPACE } = Phaser.Input.Keyboard.KeyCodes;
    this.leftInput = new MultiKey(scene, [LEFT, A]);
    this.rightInput = new MultiKey(scene, [RIGHT, D]);
    this.jumpInput = new MultiKey(scene, [UP, W, SPACE]);

    this.scene.events.on("update", this.update, this);
    this.sprite.setDataEnabled();
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
      // if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    } else if (bodyA === this.sensors.right) {
      this.isTouching.right = true;
      // if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    } else if (bodyA === this.sensors.bottom) {
      this.isTouching.ground = true;
    } else if (bodyA === this.sensors.afterJumpR) {
      this.isTouching.groundAfterJumpR = true;
    } else if (bodyA === this.sensors.afterJumpL) {
      this.isTouching.groundAfterJumpL = true;
    }
  }

  resetTouching() {
    this.isTouching.left = false;
    this.isTouching.right = false;
    this.isTouching.ground = false;
    this.isTouching.groundAfterJumpR = false;
    this.isTouching.groundAfterJumpL = false;
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
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown  = this.leftInput.isDown();
    const isJumpKeyDown  = this.jumpInput.isDown();
    const isOnGround     = this.isTouching.ground;
    const isOnLeft       = this.isTouching.left;
    const isOnRight      = this.isTouching.right;
    const isAfterJumpR   = this.isTouching.groundAfterJumpR;
    const isAfterJumpL   = this.isTouching.groundAfterJumpL;

    const isInAir = !isOnGround;





    // --- Move the player horizontally ---
    if (isLeftKeyDown) {
        sprite.applyForce({ x: -CAT_X_FORCE, y: 0 });
        this.isRight = false;

    } else if (isRightKeyDown) {
        sprite.applyForce({ x: CAT_X_FORCE, y: 0 });
        this.isRight = true;

    }

    // Limit horizontal speed, without this the player's velocity would just keep increasing to
    // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
    // interfere with gravity.
    if (velocity.x > CAT_X_MAX_VELOCITY) sprite.setVelocityX(CAT_X_MAX_VELOCITY);
    else if(velocity.x < -CAT_X_MAX_VELOCITY) sprite.setVelocityX(-CAT_X_MAX_VELOCITY);
    const maxAngle = 50;
    const h = (maxAngle * 2) / CAT_JUMP_ANIM_COUNT ;
    for( let i = 0; i < CAT_JUMP_ANIM_COUNT; i += 1){
        if(velocity.y >= CAT_JUMP_ANIM_FRAMES[i] && velocity.y <= CAT_JUMP_ANIM_FRAMES[i+1] && !this.isRight && !isOnGround){
            sprite.anims.stop();
            sprite.setTexture(this.tag, 40 + i);
            // angle change method
            sprite.setAngle( maxAngle - i*h );
        
        }
        else if(velocity.y >= CAT_JUMP_ANIM_FRAMES[i] && velocity.y <= CAT_JUMP_ANIM_FRAMES[i+1] && this.isRight && !isOnGround){
            sprite.anims.stop();
            sprite.setTexture(this.tag, 60 + i);
            // angle change method
            sprite.setAngle(i*h - maxAngle);
        }
    }
    

    // --- Move the player vertically ---

	if (isJumpKeyDown && isOnGround) {
        sprite.setVelocityY(CAT_JUMP_VELOCITY);
	}
    if(this.jumpToWall && velocity.y <= CAT_WALL_JUMP_Y_VELOCITY && speed >= CAT_X_MAX_VELOCITY*0.5 && isInAir ){
        if( this.isRight && isOnRight ){
            this.jumpToWall = false;
            sprite.setVelocityY(CAT_JUMP_VELOCITY*0.8);
        }
        else if (!this.isRight && isOnLeft ){
            this.jumpToWall = false;
            sprite.setVelocityY(CAT_JUMP_VELOCITY*0.8);
        }

    }
    if(isOnGround && !this.jumpToWall){
       this.jumpToWall = true;
    }

    // animation

    if(this.isRight && isOnGround) {
        if(speed > CAT_X_MAX_VELOCITY*0.8){
            sprite.anims.play("rightRun", true);
        }
        else {
            sprite.anims.play("rightWalk", true);
        }
    }
    else if (!this.isRight && isOnGround ){
        if(speed > CAT_X_MAX_VELOCITY*0.8){
            sprite.anims.play("leftRun", true);
        }
        else {
            sprite.anims.play("leftWalk", true);
        }
    }
    if(isAfterJumpR && sprite.body.angle != 0 && this.isRight && velocity.y > CAT_WALL_JUMP_Y_VELOCITY){
        sprite.setAngle(0);
    } else if(isAfterJumpL && sprite.body.angle != 0 && !this.isRight && velocity.y > CAT_WALL_JUMP_Y_VELOCITY ){
        sprite.setAngle(0);
    }
    else if (isOnGround && sprite.body.angle != 0){
        sprite.setAngle(0);
    }
    // if(isAfterJumpR && isInAir && velocity.y <= CAT_WALL_JUMP_Y_VELOCITY && this.jumpToWall && speed >= CAT_X_MAX_VELOCITY){
    //     this.jumpToWall = false;
    //     sprite.setVelocityY(CAT_JUMP_VELOCITY*0.9);
    // } else if(isAfterJumpL && isInAir && velocity.y <= CAT_WALL_JUMP_Y_VELOCITY && this.jumpToWall && speed >= CAT_X_MAX_VELOCITY){
    //     this.jumpToWall = false;
    //     sprite.setVelocityY(CAT_JUMP_VELOCITY*0.9);
    // }
    

    if(this.isRight && velocity.x <= 0){
        sprite.setVelocityX(CAT_X_FORCE);
    }
    else if(!this.isRight && velocity.x >= 0) {
        sprite.setVelocityX(-CAT_X_FORCE);
    }


  }


  destroy() {}
  catChange(sprite, n, def,  count = CAT_JUMP_ANIM_COUNT ){
         
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = sprite;
        const { x : x, y : y} = sprite.body.position;
        if (def){
            const mainBody1 = Bodies.circle(-w/5, h*0.25, h*0.25);
            const mainBody2 = Bodies.circle(+w/5, h*0.25, h*0.25);
            this.sensors = {
              bottom: Bodies.rectangle(0, h*0.5, w*0.8, CAT_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
              left: Bodies.circle(-w/5 - CAT_SENSOR_SIDE_WIDTH, h*0.25, h*0.25, {isSensor: true}),
              right: Bodies.circle(+w/5 + CAT_SENSOR_SIDE_WIDTH, h*0.25, h*0.25, {isSensor: true}),
              // left: Bodies.rectangle(-w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2 , { isSensor: true }),
              // right: Bodies.rectangle(w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2, { isSensor: true }),
              kostyl: Bodies.rectangle(0, -h*0.5, 10, 10, { isSensor: true })
            };

            return Body.create({
              parts: [mainBody1, mainBody2, this.sensors.bottom, this.sensors.left, this.sensors.right, this.sensors.kostyl],
              frictionStatic: 0.1,
              frictionAir: 0.01,
              friction: 0.02,
              mass: 45
            });
        }
        else {
            const half = count / 2
            const maxHeight = h*0.2;
            const d =  maxHeight / half;
            
            const mainBody1 = Bodies.circle(-w/5, h*0.25 + (maxHeight) - d * n    , h*0.25 );
            const mainBody2 = Bodies.circle(+w/5, h*0.25, h*0.25);
            this.sensors = {
              bottom: Bodies.rectangle(0, h*0.5, w*0.8, CAT_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
              left: Bodies.rectangle(-w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2 , { isSensor: true }),
              right: Bodies.rectangle(w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2, { isSensor: true }),
              kostyl: Bodies.rectangle(0, -h*0.5, 10, 10, { isSensor: true })
            };

            return {
              parts: [mainBody1, mainBody2, this.sensors.bottom, this.sensors.left, this.sensors.right, this.sensors.kostyl],
              frictionStatic: 0.1,
              frictionAir: 0.01,
              friction: 0.02,
              mass: 45
            };
         }

  }
}

