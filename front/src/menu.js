import Phaser from "phaser";
import TextButton from "./textButton.js";
import Lvl1 from "./lvl1.js";
import Lvl2 from "./lvl2.js";
import Lvl3 from "./lvl3.js";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("menu");
  }
  create() {
    this.clickButton1 = new TextButton(this, 100, 100, 'test lvl', { fill: '#0f0', font : '60px'}, () => this.onClick1());
    this.add.existing(this.clickButton1);
    this.clickButton2 = new TextButton(this, 100, 400, 'learning lvl', { fill: '#0f0', font : '60px'}, () => this.onClick2());
    this.add.existing(this.clickButton2);
    this.clickButton3 = new TextButton(this, 100, 700, 'not auto learning lvl', { fill: '#0f0', font : '60px'}, () => this.onClick3());
    this.add.existing(this.clickButton3);
  }
  onClick1() {

    if(this.scene.get("lvl1") === null) {
        this.scene.add("lvl1", Lvl1);
    }
    this.scene.start("lvl1");
  } 
  onClick2() {

    if(this.scene.get("lvl2") === null) {
        this.scene.add("lvl2", Lvl2);
    }
    this.scene.start("lvl2");
  } 
  onClick3() {

    if(this.scene.get("lvl3") === null) {
        this.scene.add("lvl3", Lvl3);
    }
    this.scene.start("lvl3");
  } 
}
