import Phaser from "phaser";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";
import Menu from "./menu.js";

const config = {
    type: Phaser.AUTO,
    width: 2000,
    height: 1000,
    pixelArt: true,
    roundPixels: true, 
    scene: Menu,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            enableSleep: true
        }
    }, scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    plugins: {
        scene: [
            {
                plugin: PhaserMatterCollisionPlugin, // The plugin class
                key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
                mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
            }
        ]
    }
};

const game = new Phaser.Game(config);
