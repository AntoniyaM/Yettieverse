import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { WorldScene } from './scenes/WorldScene'

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#3d9be0',
    pixelArt: true,
    roundPixels: true,
    // Street lamps, windows, fireflies, Yettie's glow… The furthest get culled beyond this.
    render: { maxLights: 32 },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { keyboard: { target: window } },
    scene: [BootScene, WorldScene],
    banner: false,
  })
}
