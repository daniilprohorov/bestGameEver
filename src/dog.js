
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
    

    // Create the physics-based sprite that we will move around and animate
    this.sprite = scene.matter.add.sprite(0, 0, tag, 0);

    const sensorR = 40;
    const stepH = sensorR * 4;
    const stepW = sensorR * 4;

    const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
    const { width: w, height: h } = this.sprite;

    const width = w*8; 
    const height = w*8; 
    const mainBody = Bodies.rectangle((width-stepH)/2, (height-stepW)/2, w, h, { chamfer: { radius: h*0.4 } });
    

    // ground sensor
    this.ground = Bodies.rectangle((width-stepH)/2, (width-stepH + h)/2 , w , DOG_SENSOR_BOTTOM_WIDTH, { isSensor: true }),
    

    // sensors for neural network
    this.sensors = [];
    // Track which sensors are touching something
    for ( let y = 0; y < height; y += stepH) {
        for ( let x = 0; x < width; x += stepW) {
            this.sensors.push(Bodies.circle( x, y, sensorR, {isSensor : true}));
        }
        
    }
    const compoundBody = Body.create({
      parts: [mainBody, this.ground].concat(this.sensors),
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
    this.isOnGround = false;
    // this.nTouch = new Array(this.sensors.length).fill(0)
    this.nTouch = []; 
    for( let i = 0; i < this.sensors.length; i += 1){
            this.nTouch.push(0);
    }

    this.dataSet = [];


    // Before matter's update, reset our record of which surfaces the player is touching.
    scene.matter.world.on("beforeupdate", this.resetTouching, this);
    
    // flag to be able to go up to wall
    this.jumpToWall = true;

    // neural network sensors
    for( let i = 0; i < this.sensors.length; i += 1){
        scene.matterCollision.addOnCollideStart({
          objectA: this.sensors[i],
          callback: function({ bodyA, bodyB, pair }){
              if(this.sensors[i] === bodyA) {
                  this.nTouch[i] = 1;
              } else {
                  this.nTouch[i] = 0;
              }
          },
          context: this
        });
        scene.matterCollision.addOnCollideActive({
          objectA: this.sensors[i],
          callback: function({ bodyA, bodyB, pair }){
              if(this.sensors[i] === bodyA) {
                  this.nTouch[i] = 1;
              } else {
                  this.nTouch[i] = 0;
              }
          },
          context: this
        });
    }

    // ground sensor
    scene.matterCollision.addOnCollideStart({
      objectA: this.ground,
      callback: this.onGroundCollide,
      context: this
    });
    scene.matterCollision.addOnCollideActive({
      objectA: this.ground,
      callback: this.onGroundCollide,
      context: this
    });

    // game over body sensor
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


    // Track the keys
    const { A, W, D, T} = Phaser.Input.Keyboard.KeyCodes;
    this.leftInput      = new MultiKey(scene, [A]);
    this.rightInput     = new MultiKey(scene, [D]);
    this.jumpInput      = new MultiKey(scene, [W]);
    this.test           = new MultiKey(scene, [T]);
    this.trained        = false;

    const config = {
        hiddenLayers: [50, 50],
        activation: 'tanh',  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    };

    this.net = new brain.NeuralNetwork(config);

    this.right = false;
    this.left = false;
    this.jump = false;

    this.scene.events.on("update", this.update, this);
  }

  // onSensorCollide({ bodyA, bodyB, pair }) {
  //   if (bodyB.isSensor) return; // We only care about collisions with physical objects
  //   for( let i = 0; i < this.sensors.length; i += 1){
  //       if(this.sensors[i] === bodyA) {
  //           this.nTouch[i] = 1;
  //       } else {
  //           this.nTouch[i] = 0;
  //       }
  //   }
  //
  // }
  onGroundCollide({ bodyA, bodyB, pair }) {
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    if (bodyA === this.ground) {
        this.isOnGround = true;
    }
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
    this.isOnGround = false;

    for( let i = 0; i < this.sensors.length; i += 1){
            this.nTouch[i] = 0;
    }
    
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
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown  = this.leftInput.isDown();
    const isJumpKeyDown  = this.jumpInput.isDown();
    const isTest         = this.test.isDown();
    const isOnGround     = this.isOnGround;
    const isOnGroundInt  = this.isOnGround ? 1 : 0;
    const playerRightInt = this.player.x > x ? 1 : 0;

    const nTouch         = this.nTouch1;

    

    if (velocity.x > DOG_X_MAX_VELOCITY) sprite.setVelocityX(DOG_X_MAX_VELOCITY);
    else if(velocity.x < -DOG_X_MAX_VELOCITY) sprite.setVelocityX(-DOG_X_MAX_VELOCITY);
   
    if (isLeftKeyDown || this.left) {
        sprite.applyForce({ x: -DOG_X_FORCE, y: 0 });
        let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        this.dataSet.push({input : dataSet, output : {left : 1}});
        this.left = false;

    } else if (isRightKeyDown || this.right) {
        sprite.applyForce({ x: DOG_X_FORCE, y: 0 });
        let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        this.dataSet.push({input : dataSet, output : {right : 1}});
        this.right = false;
    }

	if ((isJumpKeyDown || this.jump )  && isOnGround) {
        sprite.setVelocityY(DOG_JUMP_VELOCITY);
        let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        this.dataSet.push({input : dataSet, output : {jump : 1}});
        console.log(this.dataSet);
        this.jump = false;
    }
    if (isTest) {
        // provide optional config object (or undefined). Defaults shown.

        this.net.train(this.dataSet, {
            log: (error) => console.log(error),
            iterations: 3000,    // the maximum times to iterate the training data --> number greater than 0
            errorThresh: 0.02,   // the acceptable error percentage from training data --> number between 0 and 1
            learningRate: 0.3,    // scales with delta to effect training rate --> number between 0 and 1
            momentum: 0.1,        // scales with next layer's change value --> number between 0 and 1
            callbackPeriod: 100,   // the number of iterations through the training data between callback calls --> number greater than 0
            timeout: Infinity     // the max number of milliseconds to train for --> number greater than 0
        });

        // let dataTest = this.nTouch.concat([isOnGroundInt, playerRightInt]);
        // var output = net.run(dataTest);  // [0.987]
        this.trained = true;
        
    }
    if(this.trained) {
        let dataTest = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        let out = this.net.run(dataTest);
        console.log(out);
        if (out.left > out.right && out.left > out.jump) {
            this.left = true;
        }
        else if ( out.right > out.left && out.right > out.jump ) {
            this.right = true;
        }
        else if ( out.jump > out.left && out.jump > out.right) {
            this.jump = true;
        }

    }



  }

  destroy() {}
}

