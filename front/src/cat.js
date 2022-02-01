import MultiKey from "./multi-key.js";
import Phaser from "phaser";

// get constants from config file
const cat = require('./config.json').catConst;

const    CAT_JUMP_VELOCITY        = cat.jumpVelocity;
const    CAT_WALL_JUMP_VELOCITY   = cat.wallJumpVelocity;
const    CAT_SENSOR_BOTTOM_WIDTH  = cat.sensorBottomWidth;
const    CAT_SENSOR_SIDE_WIDTH    = cat.sensorSideWidth;
const    CAT_X_MAX_VELOCITY       = cat.xMaxVelocity;
const    CAT_X_FORCE              = cat.xForce;
const    CAT_WALL_JUMP_Y_VELOCITY = cat.wallJumpYVelocity;
const    CAT_JUMP_ANIM_COUNT      = cat.jumpAnimCount;
const    CAT_MAX_ANGLE            = cat.maxAngle
const    CAT_JUMP_ANIM_FRAMES     = [...Array(CAT_JUMP_ANIM_COUNT + 1).keys()].map( x => x*(Math.abs(CAT_JUMP_VELOCITY)/8.5) + CAT_JUMP_VELOCITY );

export default class Cat {
    constructor(scene, x, y, tag) {
        this.isRight = true;
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
          
        this.sensors = {
            bottom: Bodies.rectangle(0, h*0.5, w*0.5, CAT_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2 , { isSensor: true }),
            right: Bodies.rectangle(w * 0.45, h*0.25, CAT_SENSOR_SIDE_WIDTH, h*0.2, { isSensor: true }),
            kostyl: Bodies.rectangle(0, -h*0.75, 10, 10, { isSensor: true }),
            afterJumpR: Bodies.circle(w*0.4, h*0.55, 25, { isSensor: true}),
            afterJumpL: Bodies.circle(-w*0.4, h*0.55, 25, { isSensor: true})
        };

        const sensorsList = 
                [ this.sensors.bottom
                , this.sensors.left
                , this.sensors.right
                , this.sensors.afterJumpR
                , this.sensors.afterJumpL
                ]

        const mainBody1 = Bodies.circle(-w/5, h*0.25, h*0.25);
        const mainBody2 = Bodies.circle(+w/5, h*0.25, h*0.25);
        const compoundBody = Body.create(
            { parts: 
                [ mainBody1
                , mainBody2
                , this.sensors.bottom
                , this.sensors.left
                , this.sensors.right
                , this.sensors.kostyl
                , this.sensors.afterJumpR
                , this.sensors.afterJumpL]
            , frictionStatic: 0.1
            , frictionAir: 0.01
            , friction: 0.02
            , mass: 45
            }
        );

        this.sprite
            .setExistingBody(compoundBody)
	        .setFixedRotation() // Sets inertia to infinity so the player can't rotate
            .setPosition(x, y);
        // this.sprite.setCollisionCategory(0)
        // this.sprite.setCollidesWith(1)

        // Track which sensors are touching something
        this.isTouching = { left: false, right: false, ground: false };

        // Before matter's update, reset our record of which surfaces the player is touching.
        scene.matter.world.on("beforeupdate", this.resetTouching, this);
    
        // flag to be able to go up to wall
        this.jumpToWall = true;

        scene.matterCollision.addOnCollideStart(
            { objectA: sensorsList
            , callback: this.onSensorCollide
            , context: this
            }
        );

        scene.matterCollision.addOnCollideActive(
            { objectA: sensorsList
            , callback: this.onSensorCollide
            , context: this
            }
        );

        // Track the keys
        const { LEFT, RIGHT, UP} = Phaser.Input.Keyboard.KeyCodes;
        this.leftInput = new MultiKey(scene, [LEFT]);
        this.rightInput = new MultiKey(scene, [RIGHT]);
        this.jumpInput = new MultiKey(scene, [UP]);

        this.scene.events.on("update", this.update, this);
        this.destroyed = false;
    }

    onSensorCollide({ bodyA, bodyB, pair }) {
        //console.log(bodyA, bodyB);
        // Watch for the player colliding with walls/objects on either side and the ground below, so
        // that we can use that logic inside of update to move the player.
        // Note: we are using the "pair.separation" here. That number tells us how much bodyA and bodyB
        // overlap. We want to teleport the sprite away from walls just enough so that the player won't
        // be able to press up against the wall and use friction to hang in midair. This formula leaves
        // 0.5px of overlap with the sensor so that the sensor will stay colliding on the next tick if
        // the player doesn't move.
        if (bodyB.isSensor) return; // We only care about collisions with physical objects
        switch(bodyA) {
            case this.sensors.left:
                this.isTouching.left = true;
                break;
            case this.sensors.right:
                this.isTouching.right = true;
                break;
            case this.sensors.bottom:
                this.isTouching.ground = true;
                break;
            case this.sensors.afterJumpR:
                this.isTouching.groundAfterJumpR = true;
                break;
            case this.sensors.afterJumpL:
                this.isTouching.groundAfterJumpL = true;
                break;
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
        }
        else if (isRightKeyDown) {
            sprite.applyForce({ x: CAT_X_FORCE, y: 0 });
            this.isRight = true;
        }

        // Limit horizontal speed, without this the player's velocity would just keep increasing to
        // absurd speeds. We don't want to touch the vertical velocity though, so that we don't
        // interfere with gravity.
        if (velocity.x > CAT_X_MAX_VELOCITY) {
            sprite.setVelocityX(CAT_X_MAX_VELOCITY);
        }
        else if(velocity.x < -CAT_X_MAX_VELOCITY) {
            sprite.setVelocityX(-CAT_X_MAX_VELOCITY);
        }
        
        const h = (CAT_MAX_ANGLE * 2) / CAT_JUMP_ANIM_COUNT ;

        for( let i = 0; i < CAT_JUMP_ANIM_COUNT; i += 1){
            if(velocity.y >= CAT_JUMP_ANIM_FRAMES[i] && velocity.y <= CAT_JUMP_ANIM_FRAMES[i+1] && !this.isRight && !isOnGround){
                sprite.anims.stop();
                sprite.setTexture(this.tag, 40 + i);
                // angle change method
                sprite.setAngle( CAT_MAX_ANGLE - i*h );
            
            }
            else if(velocity.y >= CAT_JUMP_ANIM_FRAMES[i] && velocity.y <= CAT_JUMP_ANIM_FRAMES[i+1] && this.isRight && !isOnGround){
                sprite.anims.stop();
                sprite.setTexture(this.tag, 60 + i);
                // angle change method
                sprite.setAngle(i*h - CAT_MAX_ANGLE);
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


        if(this.isRight && velocity.x <= 0){
            sprite.setVelocityX(CAT_X_FORCE);
        }
        else if(!this.isRight && velocity.x >= 0) {
            sprite.setVelocityX(-CAT_X_FORCE);
        }

    }

    destroy() {
        this.destroyed = true;
    }
}

