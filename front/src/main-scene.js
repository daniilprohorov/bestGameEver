import Phaser from "phaser";
import Cat from "./cat.js";
import Dog from "./dog.js";

export default class MainScene extends Phaser.Scene {

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

        const cat = new Cat(this, 100, 1800, 'cat');
        const dog = new Dog(this, 2000, 300, 'dog', cat.sprite);
        
        const camera = this.cameras.main;
        camera.startFollow(cat.sprite, false, 0.05, 0.5, -160, 250);
        camera.setDeadzone(300, 500);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.matter.world.drawDebug = true;

    }

    update (){
    }
}
