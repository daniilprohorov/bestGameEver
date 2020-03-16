import Phaser from "phaser";
import Cat from "./cat.js";
import Dog from "./dog.js";

export default class Lvl2 extends Phaser.Scene {
    constructor() {
      super("lvl2");
    }
    preload (){
        this.load.image("tiles0", "res/lvl1/tileset0.png");
        this.load.image("tiles1", "res/lvl1/tileset1.png");
        this.load.image("tiles2", "res/lvl1/tileset2.png");
        this.load.tilemapTiledJSON("map", "res/lvl1/map.json");
        this.load.image("dog", "res/dog.png");
        this.load.spritesheet('cat',
            'res/cat.png',
            { frameWidth: 150, frameHeight: 150 }
        );

    }
    create (){
        const map = this.make.tilemap({ key: "map" });

        const tileset0 = map.addTilesetImage("tileset0", "tiles0");
        const tileset1 = map.addTilesetImage("tileset1", "tiles1");
        const tileset2 = map.addTilesetImage("tileset2", "tiles2");
        const tileset = [tileset0, tileset1, tileset2];

        const sky    = map.createStaticLayer("sky", tileset, 0, 0);
        const background = map.createStaticLayer("background", tileset, 0, 0);
        const ground = map.createDynamicLayer("ground", tileset, 0, 0);
        const gameObjects = map.createStaticLayer("gameObjects", tileset, 0, 0);
        const gameObjects1 = map.createStaticLayer("gameObjects1", tileset, 0, 0);

		gameObjects1.setCollisionByProperty({ collides: true });
		gameObjects.setCollisionByProperty({ collides: true });
		ground.setCollisionByProperty({ collides: true });

        this.matter.world.convertTilemapLayer(gameObjects1);
        this.matter.world.convertTilemapLayer(gameObjects);
        this.matter.world.convertTilemapLayer(ground);

        this.matter.world.createDebugGraphic();

        this.cat = new Cat(this, 1500, 1800, 'cat');
        // context, x, y, tag, player_sprite, learning
        this.dog = new Dog(this, 100, 1500, 'dog', this.cat.sprite, true);
        // this.dog1 = new Dog(this, 100, 1500, 'dog', this.cat.sprite, true);
        // this.dog2 = new Dog(this, 100, 1500, 'dog', this.cat.sprite, true);
        // this.dog3 = new Dog(this, 100, 1500, 'dog', this.cat.sprite, true);
        const camera = this.cameras.main;
        camera.startFollow(this.cat.sprite, false, 0.05, 0.5, -160, 250);
        // camera.setDeadzone(300, 500);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.matter.world.drawDebug = true;
        setInterval(() => console.log('Привет'), 5000);

    }

    study() {

    }

    update (){
        if (this.dog.gameOver === true) {
            this.cat.destroy();
            this.dog.destroy();
            this.scene.start("menu");
        }
    }
}
