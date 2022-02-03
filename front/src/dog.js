import MultiKey from "./multi-key.js";
import Phaser from "phaser";
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

const isDog = (obj) => {
  obj.isDog = true;
  return obj
}
export default class Dog {

    constructor(scene, x, y, tag, player, learning, n) {

        this.endTime = null; // end time
        // Create the physics-based sprite that we will move around and animate
        this.sprite = scene.matter.add.sprite(0, 0, tag, 0);
        this.tag = 'dog' + n;
        const sensorR = 40;
        const stepH = sensorR * 4;
        const stepW = sensorR * 4;

        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules
        const { width: w, height: h } = this.sprite;


        const width = w*8;
        const height = w*8;
        const mainBody = isDog(Bodies.rectangle((width-stepH)/2, (height-stepW)/2, w, h, { chamfer: { radius: h*0.4 } }));
        // let label = scene.add.text(-12.5,-12.5, this.tag,{
        //     fontFamily:'Arial',
        //     color:'#FFFFFF',
        //     align:'center',
        // }).setFontSize(18);
        // label.setOrigin(0.5);
        // ground sensor

        this.ground = isDog(Bodies.rectangle((width-stepH)/2, (width-stepH + h)/2 , w , DOG_SENSOR_BOTTOM_WIDTH, { isSensor: true }));

        // sensors for neural network
        this.sensors = [];
        this.sensorsML = [];
        // Track which sensors are touching something
        for ( let y = 0; y < height; y += stepH) {
            for ( let x = 0; x < width; x += stepW) {
                this.sensors.push(Bodies.circle( x, y, sensorR, {isSensor : true}));

            }
        }

        // this.inputCount = sensors count;
        this.inputCount = this.sensors.length + 3;
        this.model = createModel(this.inputCount);
        this.scene = scene;
        this.player = player;
        this.catCollide = false;
        this.learning = learning;

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

        const newCategory  = scene.matter.world.nextCategory();
        this.sprite.setCollisionCategory(newCategory)
        this.sprite.setCollidesWith(1)


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
                  if(bodyB.isDog) return;
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
                  if(bodyB.isDog) return;
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
        // scene.matterCollision.addOnCollideActive({
        //   objectA: this.ground,
        //   callback: this.onGroundCollide,
        //   context: this
        // });

        // game over body sensor
        scene.matterCollision.addOnCollideStart({
          objectA: mainBody,
          callback: this.onDogCollide,
          context: this
        });
        // scene.matterCollision.addOnCollideActive({
        //   objectA: mainBody,
        //   callback: this.onDogCollide,
        //   context: this
        // });


        // Track the keys
        const { A, W, D} = Phaser.Input.Keyboard.KeyCodes;
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

        this.right = false;
        this.left = false;
        this.jump = false;
        this.isRunToggle = false;

        this.scene.events.on("update", this.update, this);
        // this.scene.events.on("update", this.update, this);
        // Before matter's update, reset our record of which surfaces the player is touching.
        scene.matter.world.on("beforeupdate", this.resetTouching, this);

        // инициализируем датасет
        this.dataSet = [];

        this.canCollide = true;

    }
    predict(inputList) {
        const weights = this.model.getWeights();
        // for (let i = 0; i < weights.length; i++) {
        //     console.log(i);
        //     weights[i].print();
        // }

        // weights[0].print();
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
      if (bodyB.isDog) return; // Not collide with other dogs
      if (bodyA === this.ground) {
          this.nTouch[0] = 1;
          this.isOnGround = true;
      }
  }
  onDogCollide({ bodyA, bodyB, pair }) {
    if (bodyB.isSensor) return; // We only care about collisions with physical objects
    if (bodyB.isDog && bodyA.isDog) return; // Not collide with other dogs
    if (this.player.body.parts.some( x => {return x === bodyB;}) ) {
        // this.canCollide = false
        this.scene.matterCollision.removeAllCollideListeners()
        console.log("GAME OVER");
        console.log(this.tag);
        this.endTime = new Date().getTime();
        this.catCollide = true;
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
        //this.net.fromJSON(response.data);
        // запускаем игру
        //this.isRunToggle = true;
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

    destroy() {
        this.destroyed = true;
        this.sprite.destroy();
    }
}

