import Phaser from "phaser";
import TextButton from "./textButton.js";
import MainScene from "./main-scene.js";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("menu");
  }
  create() {
    this.clickButton = new TextButton(this, 100, 100, 'test lvl', { fill: '#0f0', font : '60px'}, () => this.onClick());
    this.add.existing(this.clickButton);
  }
  onClick() {
    if(this.scene.get("testLvl") === null) {
        this.scene.add("testLvl", MainScene);
    }
    this.scene.start("testLvl");
  } 
}
