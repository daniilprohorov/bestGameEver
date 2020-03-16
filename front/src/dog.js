import MultiKey from "./multi-key.js";
import Phaser from "phaser";
import brain from "brain.js";
import axios from "axios";

// tf
// import tf from "@tensorflow/tfjs-node-gpu";
import * as tf from '@tensorflow/tfjs';

// get constants from config file
const dog = require('./config.json').dogConst;

const DOG_JUMP_VELOCITY       = dog.jumpVelocity;
const DOG_WALL_JUMP_VELOCITY  = dog.wallJumpVelocity;
const DOG_SENSOR_BOTTOM_WIDTH = dog.sensorBottomWidth;
const DOG_SENSOR_SIDE_WIDTH   = dog.sensorSideWidth;
const DOG_X_MAX_VELOCITY      = dog.xMaxVelocity;
const DOG_X_FORCE             = dog.xForce;

// wasOnGround = false;
// stop = false
const createModel = (inputCount) => {
    // Create a sequential model
    const model = tf.sequential();
    // Add a single hidden layer
    model.add(tf.layers.dense({inputShape: [inputCount], units: inputCount, activation: 'relu' }));

    // Add an output layer
    model.add(tf.layers.dense({units: 3, useBias: true, activation: 'softmax'}));
    return model;
}



export default class Dog {

    constructor(scene, x, y, tag, player, learning) {
        this.inputCount = 103;
        this.model = createModel(this.inputCount);
        this.scene = scene;
        this.player = player;
        this.gameOver = false;
        this.learning = learning;


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
        this.sensorsML = [];
        // Track which sensors are touching something
        for ( let y = 0; y < height; y += stepH) {
            for ( let x = 0; x < width; x += stepW) {
                this.sensors.push(Bodies.circle( x, y, sensorR, {isSensor : true}));

            }
        }
        console.log(this.sensors);
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
        for( let i = 0; i < this.sensors.length + 3; i += 1){
                this.nTouch.push(0);
        }


        // flag to be able to go up to wall
        this.jumpToWall = true;

        // neural network sensors
        for( let i = 0; i < this.sensors.length; i += 1){
            scene.matterCollision.addOnCollideStart({
              objectA: this.sensors[i],
              callback: function({ bodyA, bodyB, pair }){
                  if(this.sensors[i] === bodyA) {
                      this.nTouch[i+3] = 1;
                  } else {
                      this.nTouch[i+3] = 0;
                  }
              },
              context: this
            });
            scene.matterCollision.addOnCollideActive({
              objectA: this.sensors[i],
              callback: function({ bodyA, bodyB, pair }){
                  if(this.sensors[i] === bodyA) {
                      this.nTouch[i+3] = 1;
                  } else {
                      this.nTouch[i+3] = 0;
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
        const { A, W, D, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN} = Phaser.Input.Keyboard.KeyCodes;
        // 1 - импортировать нейросеть
        // 2 - обучить нейросеть и записать в файл
        // 3 - старт/стоп собаки
        // 4 - экспорт датасета
        // 5 - импорт датасета
        // 6 - рестарт игры
        // 7 - восстановить прежнее обучение
        this.leftInput   = new MultiKey(scene, [A]);
        this.rightInput  = new MultiKey(scene, [D]);
        this.jumpInput   = new MultiKey(scene, [W]);
        this.sendKey     = new MultiKey(scene, [ONE]);
        this.trainKey    = new MultiKey(scene, [TWO]);
        this.runKey      = new MultiKey(scene, [THREE]);
        this.sendDataKey = new MultiKey(scene, [FOUR]);
        this.getDataKey  = new MultiKey(scene, [FIVE]);
        this.restartKey  = new MultiKey(scene, [SIX]);
        this.goBackKey   = new MultiKey(scene, [SEVEN]);

        // флаг чтобы не было много ивентов при нажатии кнопки 7
        this.goBackFlag  = true;

        const config = {
            hiddenLayers: [30, 30, 30],
            activation: 'sigmoid',  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
        };

        this.net = new brain.NeuralNetwork(config);

        this.right = false;
        this.left = false;
        this.jump = false;
        this.isRunToggle = false;
        this.isSend = false;

        this.scene.events.on("update", this.update, this);
        // this.scene.events.on("update", this.update, this);
        // Before matter's update, reset our record of which surfaces the player is touching.
        scene.matter.world.on("beforeupdate", this.resetTouching, this);

        // инициализируем датасет
        this.dataSet = [];

    }
    predict(inputList) {
        const weights = this.model.getWeights();
        // for (let i = 0; i < weights.length; i++) {
        //     weights[i].print();
        // }
        weights[0].print();
        const xs = tf.tensor1d(inputList);
        const length = inputList.length;
        if (this.inputCount != length) {
            console.log("Input count != input list length");
            return NULL;
        }
        else {
            const preds = this.model.predict(xs.reshape([1, length]));
            const output = {left:0, right:0, jump:0};
            const predictArray = preds.arraySync()[0];
            if (predictArray[0] > predictArray[1] && predictArray[0] > predictArray[2]){
                output.left = 1;
                return output;
            }
            else if(predictArray[1] > predictArray[0] && predictArray[1] > predictArray[2]){
                output.right = 1;
                return output;
            }
            else {
                output.jump = 1;
                return output;
            }
            //preds.print();
        }
    }
  onGroundCollide({ bodyA, bodyB, pair }) {
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    if (bodyA === this.ground) {
        this.nTouch[0] = 1;
        this.isOnGround = true;
    }
  }
  onDogCollide({ bodyA, bodyB, pair }) {
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
      if (this.player.body.parts.some( x => {return x === bodyB;})) {
        //console.log("GAME OVER");
        if(this.learning) {
            this.train();
        }
        this.gameOver = true;

    }
  }

  resetTouching() {
    this.isOnGround = false;

    for( let i = 0; i < this.nTouch.length; i += 1){
            this.nTouch[i] = 0;
    }
    this.nTouch[1] = 0.5;
    this.nTouch[2] = 0.5;
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
    const y              = sprite.y;
    const isRightKeyDown = this.rightInput.isDown();
    const isLeftKeyDown  = this.leftInput.isDown();
    const isJumpKeyDown  = this.jumpInput.isDown();
    const isSend         = this.sendKey.isDown();
    const isTrain        = this.trainKey.isDown();
    const isSendData     = this.sendDataKey.isDown();
    const isGetData      = this.getDataKey.isDown();
    const isRestart      = this.restartKey.isDown();
    const isGoBack       = this.goBackKey.isDown();
    this.isRunToggle     = this.runKey.isDown() ? !this.isRunToggle : this.isRunToggle ;

    const isOnGround     = this.isOnGround;
    const isOnGroundInt  = this.isOnGround ? 1 : 0;
    const playerRightInt = this.player.x > x ? 1 : 0;
    const playerUpInt    = this.player.y > y ? 1 : 0;

    this.nTouch[1] = playerRightInt;
    this.nTouch[2] = playerUpInt;
    const nTouch         = this.nTouch;


    const res = this.predict(nTouch);

    if (velocity.x > DOG_X_MAX_VELOCITY) sprite.setVelocityX(DOG_X_MAX_VELOCITY);
    else if(velocity.x < -DOG_X_MAX_VELOCITY) sprite.setVelocityX(-DOG_X_MAX_VELOCITY);
   
      if (isLeftKeyDown || this.left || res.left) {
        sprite.applyForce({ x: -DOG_X_FORCE, y: 0 });
        //let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        //this.dataSet.push({input : dataSet, output : {left : 1}});
        this.left = false;

      } else if (isRightKeyDown || this.right || res.right) {
        sprite.applyForce({ x: DOG_X_FORCE, y: 0 });
        //let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        //this.dataSet.push({input : dataSet, output : {right : 1}});
        this.right = false;
    }

	if ((isJumpKeyDown || this.jump || res.jump)  && isOnGround) {
        sprite.setVelocityY(DOG_JUMP_VELOCITY);
        //let dataSet = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        //this.dataSet.push({input : dataSet, output : {jump : 1}});
        // console.log(this.dataSet);
        this.jump = false;
    }
	if (isSend) {
        this.getTrain();
	}
    if (isTrain) {
        this.train(); 
    }
    if(this.isRunToggle) {
        //let dataTest = this.nTouch.concat([isOnGroundInt, playerRightInt]); 
        //let out = this.net.run(dataTest);
        //console.log(out);
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
    if (isSendData) {
        this.sendData(this.dataSet);
    }
    if (isGetData) {
        this.getData();
    }
    if (isRestart) {
        this.gameOver = true;
    }
    if (isGoBack && this.goBackFlag) {
        this.goBackFlag = false;
        this.goBack(); 
    }
  }

  sendTrain(data) {
    axios.post('/sendTrain', {data : data})
      .then(function (response) {
        //console.log(response);
      })
      .catch(function (error) {
        //console.log(error);
      });
  }

  getTrain() {
    axios.post('/getTrain')
      .then(response => {
          //console.log(response);
        // импортируем нейросеть из полученного JSON
        this.net.fromJSON(response.data);
        // запускаем игру
        this.isRunToggle = true;
      });
  }
  sendData(data) {
    axios.post('/sendData', {data : data})
      .then(function (response) {
        //console.log(response);
      })
      .catch(function (error) {
        //console.log(error);
      });
  }
  getData() {
    axios.post('/getData')
      .then(response => {
        this.dataSet = response.data;
      });
  }
  goBack() {
    axios.post('/goBack')
      .then(response => {
          //console.log(response);
        // перезапускаем игру
        this.gameOver = true;
      });
  }
    
  train() {
      //console.log("ОБУЧЕНИЕ");
      //console.log(this.dataSet);
    // обучаем нейросеть
    this.net.train(this.dataSet, {
        log: (error) => console.log(error),
        iterations: 2000,    // the maximum times to iterate the training data --> number greater than 0
        errorThresh: 0.02,   // the acceptable error percentage from training data --> number between 0 and 1
        learningRate: 0.3,    // scales with delta to effect training rate --> number between 0 and 1
        momentum: 0.1,        // scales with next layer's change value --> number between 0 and 1
        callbackPeriod: 100,   // the number of iterations through the training data between callback calls --> number greater than 0
        timeout: Infinity     // the max number of milliseconds to train for --> number greater than 0
    });
    // сохраняем нейросеть в файл 
    this.sendTrain(this.net.toJSON());
    // сохраняем датасет
    this.sendData(this.dataSet);
  }

  destroy() {
    this.destroyed = true;
  }
}

