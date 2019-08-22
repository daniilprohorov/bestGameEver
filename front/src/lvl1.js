import Phaser from "phaser";
import Cat from "./cat.js";
import Dog from "./dog.js";

export default class Lvl1 extends Phaser.Scene {
    constructor() {
      super("lvl1");
    }
    preload (){
        this.load.image("tiles0", "res/tileset0.png");
        this.load.image("tiles1", "res/tileset1.png");
        this.load.image("dog", "res/dog.png");
        this.load.tilemapTiledJSON("map", "res/map.json");
        this.load.spritesheet('cat',
            'res/cat.png',
            { frameWidth: 150, frameHeight: 150 }
        );

    } 
    create (){
        
        const map = this.make.tilemap({ key: "map" }) 

        const tileset0 = map.addTilesetImage("tileset0", "tiles0");
        const tileset1 = map.addTilesetImage("tileset1", "tiles1");
        
        const tileset = [tileset0, tileset1];

        const sky    = map.createStaticLayer("sky", tileset, 0, 0);
        const background = map.createStaticLayer("background", tileset, 0, 0);
        const ground = map.createDynamicLayer("ground", tileset, 0, 0);
        const gameObjects = map.createStaticLayer("gameObjects", tileset, 0, 0);

		gameObjects.setCollisionByProperty({ collides: true }); 
		ground.setCollisionByProperty({ collides: true }); 

        this.matter.world.convertTilemapLayer(gameObjects);
        this.matter.world.convertTilemapLayer(ground);

        this.matter.world.createDebugGraphic();

        this.cat = new Cat(this, 1500, 1800, 'cat');
        // context, x, y, tag, player_sprite, learning, autoMoving
        this.dog = new Dog(this, 100, 1800, 'dog', this.cat.sprite, false, true);
        
        const camera = this.cameras.main;
        camera.startFollow(this.cat.sprite, false, 0.05, 0.5, -160, 250);
        // camera.setDeadzone(300, 500);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.matter.world.drawDebug = true;

    }

    update (){
        if (this.dog.gameOver === true) {
            this.cat.destroy();
            this.dog.destroy();
            this.scene.start("menu");     
        }
    }
}
