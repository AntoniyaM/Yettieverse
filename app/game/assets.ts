// Every image the game loads, keyed by texture name. Files live in public/.
// Multi-frame sprites are strips (or, for Yettie, a 5×4 grid) of equal-sized frames.

export const TILESET = { key: 'tiles', path: '/tiles/tileset.png' }

// Single images.
export const IMAGES: Record<string, string> = {
  'npc-broc': '/sprites/characters/broc.png',
  'npc-avo': '/sprites/characters/avo.png',
  'npc-pear': '/sprites/characters/pear.png',
  'npc-shelly': '/sprites/characters/shelly.png',
  'item-carrot': '/sprites/items/carrot.png',
  'item-berry': '/sprites/items/berry.png',
  'item-dewdrop': '/sprites/items/dewdrop.png',
  'wear-chefhat': '/sprites/wearables/chef-hat.png',
  'wear-crown': '/sprites/wearables/crown.png',
  'wear-bow': '/sprites/wearables/bow.png',
  'wear-shades': '/sprites/wearables/shades.png',
  'wear-nightcap': '/sprites/wearables/nightcap.png',
  floatie: '/sprites/wearables/floatie.png',
  sign: '/sprites/props/sign.png',
  'house-broc': '/sprites/props/house-broc.png',
  'house-avo': '/sprites/props/house-avo.png',
  'house-mama': '/sprites/props/house-mama.png',
  'house-glow': '/sprites/props/house-glow.png',
  spark: '/sprites/fx/spark.png',
  heart: '/sprites/fx/heart.png',
  note: '/sprites/fx/note.png',
  px: '/sprites/fx/pixel.png',
  dust: '/sprites/fx/dust.png',
  glow: '/sprites/fx/glow.png',
  firefly: '/sprites/fx/firefly.png',
  shadow: '/sprites/fx/shadow.png',
  ripple: '/sprites/fx/ripple.png',
  'ind-available': '/sprites/ui/marker-available.png',
  'ind-ready': '/sprites/ui/marker-ready.png',
  'ind-active': '/sprites/ui/marker-active.png',
  arrow: '/sprites/ui/arrow.png',
}

// Sprite sheets, with the size of one frame.
const yettie = (path: string) => ({ path, frameWidth: 32, frameHeight: 32 })
export const SHEETS: Record<string, { path: string; frameWidth: number; frameHeight: number }> = {
  // Yettie and the recoloured family. Each has a matching closed-eye sheet for blinking.
  yettie: yettie('/sprites/characters/yettie.png'),
  'yettie-blink': yettie('/sprites/characters/yettie-blink.png'),
  'yettie-mama': yettie('/sprites/characters/yettie-mama.png'),
  'yettie-mama-blink': yettie('/sprites/characters/yettie-mama-blink.png'),
  'yettie-pip': yettie('/sprites/characters/yettie-pip.png'),
  'yettie-pip-blink': yettie('/sprites/characters/yettie-pip-blink.png'),
  // Moonpetal: frame 0 is a closed bud (day), frame 1 is open (night).
  'item-moonpetal': { path: '/sprites/items/moonpetal.png', frameWidth: 9, frameHeight: 12 },
  // Drip: frame 0 is sad, frame 1 is happy.
  'npc-drip': { path: '/sprites/characters/drip.png', frameWidth: 13, frameHeight: 17 },
  // Lamp: frame 0 is off (day), frame 1 is lit.
  lamp: { path: '/sprites/props/lamp.png', frameWidth: 12, frameHeight: 28 },
  // Bell: frame 0 is waiting, frame 1 is rung.
  bell: { path: '/sprites/props/bell.png', frameWidth: 20, frameHeight: 28 },
  // Fountain: frame 0 is dry, frames 1–2 are flowing.
  fountain: { path: '/sprites/props/fountain.png', frameWidth: 32, frameHeight: 40 },
  butterfly: { path: '/sprites/fx/butterfly.png', frameWidth: 5, frameHeight: 4 },
}
