import Phaser from "phaser";
export default class TextButton extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, style, callback) {
    super(scene, x, y, text, style);

    this.setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        callback();
      });
  }

}
