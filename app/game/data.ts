// Story content: items, wearables, characters, quests and dialog.
// Everything the player reads lives here, so writing new quests is mostly data.

export type ItemId = 'carrot' | 'berry' | 'dewdrop' | 'moonpetal'
export type CosmeticId = 'chefhat' | 'bow' | 'crown' | 'shades' | 'nightcap'
export type AbilityId = 'dash' | 'floatie' | 'boots'
export type QuestId = 'soup' | 'berries' | 'steps' | 'hydrate' | 'pip' | 'bells' | 'dreams' | 'tour'
export type NpcId = 'broc' | 'avo' | 'drip' | 'mama' | 'pear' | 'shelly' | 'pip'
export type Speaker = NpcId | 'yettie' | 'narrator'

export const ITEMS: Record<ItemId, { name: string; plural: string; icon: string }> = {
  carrot: { name: 'Crunchy Carrot', plural: 'carrots', icon: 'item-carrot' },
  berry: { name: 'Wild Strawberry', plural: 'strawberries', icon: 'item-berry' },
  dewdrop: { name: 'Magic Dewdrop', plural: 'dewdrops', icon: 'item-dewdrop' },
  moonpetal: { name: 'Moonpetal', plural: 'moonpetals', icon: 'item-moonpetal' },
}

export const COSMETICS: Record<CosmeticId, { name: string; slot: 'hat' | 'face'; icon: string; blurb: string }> = {
  chefhat: { name: 'Chef Hat', slot: 'hat', icon: 'wear-chefhat', blurb: 'Smells faintly of soup.' },
  bow: { name: "Pip's Lucky Bow", slot: 'hat', icon: 'wear-bow', blurb: 'Lucky. Probably.' },
  crown: { name: 'Golden Crown', slot: 'hat', icon: 'wear-crown', blurb: 'Hero of the Yettieverse.' },
  shades: { name: 'Racing Shades', slot: 'face', icon: 'wear-shades', blurb: 'Cool fluff, cooler eyewear.' },
  nightcap: { name: 'Starry Nightcap', slot: 'hat', icon: 'wear-nightcap', blurb: 'Eight hours, minimum.' },
}

export const ABILITIES: Record<AbilityId, { name: string; blurb: string; icon: string }> = {
  dash: { name: 'Zoomy Sneakers', blurb: 'Hold Shift to dash.', icon: '👟' },
  floatie: { name: 'Lucky Floatie', blurb: 'Swim across water.', icon: '🛟' },
  boots: { name: 'Snow Boots', blurb: 'Stomp through snowdrifts.', icon: '🥾' },
}

export const NPCS: Record<NpcId, { name: string; portrait: string; idle: string[] }> = {
  broc: {
    name: 'Chef Broc',
    portrait: 'npc-broc',
    idle: ['The secret ingredient is love. And also carrots.', "Soup's on! Well, it will be. In about six hours."],
  },
  avo: {
    name: 'Granny Avo',
    portrait: 'npc-avo',
    idle: [
      "Did you know avocados are berries? I'm basically family with those strawberries.",
      'Back in my day we walked up Frosty Peak. Both ways.',
    ],
  },
  drip: {
    name: 'Drip',
    portrait: 'npc-drip-1',
    idle: [
      "Had a glass of water today? Just asking. I'm literally made of it.",
      'Toss 5 diamonds in the fountain and make a wish!',
    ],
  },
  mama: {
    name: 'Mama Yettie',
    portrait: 'npc-mama',
    idle: ['Remember to rest, sweetie. Even heroes need naps.', "Pip hasn't stopped talking about your swimming."],
  },
  pear: {
    name: 'Professor Pear',
    portrait: 'npc-pear',
    idle: ["My research shows you're 100% delightful.", "Pear-haps we'll find more mysteries someday."],
  },
  shelly: {
    name: 'Sir Shelly',
    portrait: 'npc-shelly',
    idle: ['Slow and steady. Mostly slow.', 'I once walked to the beach. Took me a fortnight.'],
  },
  pip: {
    name: 'Pip',
    portrait: 'npc-pip',
    idle: ["When I grow up I'm gonna be as fluffy as you!", 'Mama says I can have a carrot later!'],
  },
}

export interface DialogLine {
  speaker: Speaker
  text: string
  choices?: string[]
}
const say = (speaker: Speaker, ...texts: string[]): DialogLine[] => texts.map((text) => ({ speaker, text }))

export type Objective =
  | { type: 'collect'; item: ItemId; count: number; where: string }
  | { type: 'steps'; count: number }
  | { type: 'flags'; flags: string[]; label: string }

export interface QuestDef {
  id: QuestId
  title: string
  giver: NpcId
  requires: QuestId[]
  summary: string
  objective: Objective
  reward: { diamonds: number; cosmetic?: CosmeticId; ability?: AbilityId }
  // Shown before the quest is unlocked.
  locked?: DialogLine[]
  intro: DialogLine[]
  waiting: DialogLine[]
  done: DialogLine[]
}

export const QUESTS: QuestDef[] = [
  {
    id: 'soup',
    title: "Soup's On!",
    giver: 'broc',
    requires: [],
    summary: "Pick 8 crunchy carrots for Chef Broc's Sunshine Soup. Carrot Meadow (west) has some, Blossom Orchard (far south-east) has the rest.",
    objective: { type: 'collect', item: 'carrot', count: 8, where: 'Carrot Meadow and Blossom Orchard' },
    reward: { diamonds: 20, cosmetic: 'chefhat' },
    intro: [
      ...say('broc', "Yettie! Thank goodness. I'm making my legendary Sunshine Soup and I'm OUT of carrots!"),
      ...say('broc', 'Could you pick 8 crunchy carrots? Carrot Meadow is down the road west.'),
      ...say('broc', "If the meadow runs dry, the veggie beds in Blossom Orchard are a lovely walk south-east. Past the beach!"),
      ...say('yettie', '*determined fluff wiggle*'),
    ],
    waiting: say('broc', 'The pot is bubbling! 8 carrots: Carrot Meadow out west, and the orchard beds south-east.'),
    done: [
      ...say('broc', 'Look at these beauties! Orange, crunchy, full of vitamin A. You will see in the dark!'),
      ...say('broc', 'Here, take my spare chef hat. Every great cook needs one. Even a fluffy one.'),
      ...say('broc', 'Oh, and Drip at the fountain looks a little... dry. Maybe say hi?'),
    ],
  },
  {
    id: 'berries',
    title: 'Berry Good Friends',
    giver: 'avo',
    requires: [],
    summary: "Gather 12 wild strawberries in Whisper Woods for Granny Avo's jam. A few hide under the leaves, right beside the trails.",
    objective: { type: 'collect', item: 'berry', count: 12, where: 'Whisper Woods' },
    reward: { diamonds: 20, ability: 'dash' },
    intro: [
      ...say('avo', "Oh, hello dearie! My old knees can't do Whisper Woods anymore."),
      ...say('avo', 'Would you gather 12 wild strawberries for my famous jam? They grow along the forest trails, up north-west.'),
      ...say('avo', 'The shy ones hide under the leaves. Look for a little twinkle in the trees, dearie.'),
      ...say('avo', 'Mind the trees. They whisper, but they never spill the tea.'),
    ],
    waiting: say('avo', 'Twelve strawberries, sweetie. Peek under the trees by the trails. Shy berries twinkle!'),
    done: [
      ...say('avo', 'Oh, they smell like summer! Here, these were my zoomy sneakers back in the day.'),
      ...say('avo', "Hold SHIFT to dash. Don't tell your Mama I gave you these."),
    ],
  },
  {
    id: 'steps',
    title: 'Walk It Off',
    giver: 'shelly',
    requires: [],
    summary: 'Take 2,500 steps anywhere on the island. Sir Shelly is counting. Slowly.',
    objective: { type: 'steps', count: 2500 },
    reward: { diamonds: 20, cosmetic: 'shades' },
    intro: [
      ...say('shelly', 'Ahem! Sir Shelly, champion walker, at your service.'),
      ...say('shelly', 'Movement is medicine, young Yettie. Take 2,500 steps, anywhere you like, and I shall reward you handsomely.'),
      ...say('shelly', "I'll wait here. I've already done my steps today. All four of them."),
    ],
    waiting: say('shelly', "Keep those fluffy feet moving! Every step counts. Literally. I'm counting."),
    done: [
      ...say('shelly', 'Two and a half thousand steps! Magnificent! Your heart thanks you. My shell salutes you.'),
      ...say('shelly', 'These are my racing shades. Cool fluff deserves cool eyewear.'),
    ],
  },
  {
    id: 'hydrate',
    title: 'Hydration Station',
    giver: 'drip',
    requires: ['soup'],
    summary: 'Find the 6 magic Dewdrops (meadow, woods, shore, village, glade and orchard) and refill the plaza fountain.',
    objective: { type: 'collect', item: 'dewdrop', count: 6, where: 'all over the island' },
    reward: { diamonds: 20, ability: 'floatie' },
    locked: say('drip', '*sniff* ...The fountain is so dry. A hydration spirit without water. How embarrassing.'),
    intro: [
      ...say('drip', "Oh! Yettie! The fountain dried up, and I'm supposed to be the village's hydration spirit..."),
      ...say('drip', '6 magic Dewdrops are hidden on the island: in the meadow, the woods, by the shore, in the village, in Starlight Glade and in Blossom Orchard.'),
      ...say('drip', 'The glade and orchard ones are sneaky. They nap under tree leaves. Look for the blue glow!'),
      ...say('drip', "Bring them back and we'll fill this fountain right up! Hydration is the best motivation!"),
    ],
    waiting: say('drip', "Look for twinkly blue sparkles! Meadow, woods, shore, Granny Avo's garden, and under the trees in the glade and the orchard."),
    done: [
      ...say('drip', '*SPLOOSH* We did it! The fountain is flowing again!'),
      ...say('drip', 'You deserve my lucky floatie. Now you can swim across water!'),
      ...say('drip', 'Psst. Mama Yettie seemed worried. Something about Pip?'),
    ],
  },
  {
    id: 'pip',
    title: 'Lost & Fluffy',
    giver: 'mama',
    requires: ['hydrate'],
    summary: 'Little Pip is stuck on the isle in the middle of Glimmer Lake (east). Swim out and bring Pip home.',
    objective: { type: 'flags', flags: ['pipFollowing'], label: 'Find Pip on the lake isle' },
    reward: { diamonds: 25, ability: 'boots', cosmetic: 'bow' },
    locked: say('mama', 'Have you seen Pip, sweetie? Pip was chasing butterflies over by the lake...'),
    intro: [
      ...say('mama', 'Yettie! Pip chased a butterfly and now they are stuck on the little isle in Glimmer Lake!'),
      ...say('mama', "With Drip's floatie you can swim out there. Please bring my little fluffball home!"),
    ],
    waiting: say('mama', 'Pip is on the isle in the middle of Glimmer Lake, east of the village. Please hurry!'),
    done: [
      ...say('mama', 'PIP! Oh, my little sprout! *the biggest group hug in Yettieverse history*'),
      ...say('pip', 'Big Yettie swam SO fast! Like a fluffy boat!'),
      ...say('mama', 'Take these snow boots. Professor Pear has been waiting for someone brave enough for Frosty Peak.'),
      ...say('pip', "And my bow! It's lucky. Probably."),
    ],
  },
  {
    id: 'tour',
    title: 'The Grand Tour',
    giver: 'shelly',
    requires: ['steps'],
    summary: 'Visit the 5 lookouts at the far corners of the island: woods, meadow, cove, glade and orchard. Stop and enjoy each view.',
    objective: { type: 'flags', flags: ['view0', 'view1', 'view2', 'view3', 'view4'], label: 'lookouts visited' },
    reward: { diamonds: 30 },
    locked: say('shelly', 'Walk a little more first, young Yettie. Then I shall tell you of the Grand Tour.'),
    intro: [
      ...say('shelly', 'Now that your legs are warmed up: the Grand Tour! Five lookouts sit at the far corners of our island.'),
      ...say('shelly', 'One in the woods, one on the meadow cliffs, one in the cove, one past the glade and one below the orchard.'),
      ...say('shelly', "Visit each one and simply... look. Breathe. Nobody ever regretted a nice view."),
    ],
    waiting: say('shelly', 'Five lookouts: woods, meadow, cove, glade, orchard. Your map shows the coast. Take your time!'),
    done: [
      ...say('shelly', 'All five! You have seen more of this island than I have in ninety years.'),
      ...say('shelly', "Walking somewhere beautiful is the best kind of walking. Here's a little something for your travels."),
    ],
  },
  {
    id: 'dreams',
    title: 'Sweet Dreams Tea',
    giver: 'mama',
    requires: ['pip'],
    summary: 'Pick 6 Moonpetals in the clearing of Starlight Glade (far east). They only open at night. Nap at home to skip ahead.',
    objective: { type: 'collect', item: 'moonpetal', count: 6, where: 'Starlight Glade' },
    reward: { diamonds: 30, cosmetic: 'nightcap' },
    locked: say('mama', 'Pip has been so restless at bedtime lately...'),
    intro: [
      ...say('mama', "Pip is too excited to sleep after all that adventure. I'd love to brew some Moonpetal tea."),
      ...say('mama', 'Moonpetals grow in the clearing of Starlight Glade, far east past the lake. But they only open at night.'),
      ...say('mama', "No rush, sweetie. If it's still sunny, have a nap at home first. Just knock on our door."),
    ],
    waiting: say('mama', 'Six Moonpetals from Starlight Glade. They open when the moon is up. Our door is always open for a nap!'),
    done: [
      ...say('mama', 'They smell like lavender and starlight. Pip will be asleep in two sips.'),
      ...say('pip', '*yaaawn* ...m not even... sleepy...'),
      ...say('mama', 'Here, a nightcap for you, too. Good rest makes good heroes.'),
    ],
  },
  {
    id: 'bells',
    title: 'Peak Performance',
    giver: 'pear',
    requires: ['pip'],
    summary: 'Stomp through the snowdrift gate and ring the 3 Wishing Bells on Frosty Peak.',
    objective: { type: 'flags', flags: ['bell0', 'bell1', 'bell2'], label: 'Wishing Bells rung' },
    reward: { diamonds: 50, cosmetic: 'crown' },
    locked: say('pear', 'Hmm, hmm. The Wishing Bells on Frosty Peak have been silent for years. Pity nobody owns snow boots...'),
    intro: [
      ...say('pear', 'Ah, snow boots! Splendid! Now listen carefully. This is very scientific.'),
      ...say('pear', 'Three Wishing Bells sit on Frosty Peak. Ring all three and the whole Yettieverse will light up!'),
      ...say('pear', "The gate is just behind me, through the snowdrift. Do wear a scarf. Oh. You're a yeti. Never mind."),
    ],
    waiting: say('pear', 'Three bells, Yettie! Two trails, one summit. Science awaits!'),
    done: [
      ...say('pear', 'Did you see that?! The sparkles! The Yettieverse is GLOWING!'),
      ...say('pear', 'By the power vested in me by the Academy of Fruit, I crown you Hero of the Yettieverse!'),
    ],
  },
]

export const PIP_LINES = {
  found: [
    ...say('pip', 'YETTIE!! I followed a butterfly and then the butterfly left and then I was on an island!'),
    ...say('pip', "Can we go home? I'm hungry. And my fluff is damp."),
    ...say('narrator', 'Pip is following you. Take Pip home to Mama Yettie!'),
  ],
  following: ['Are we there yet?', 'I like your floatie!', 'Mama is gonna be SO happy.', 'Wheee!'],
}

// What Yettie sees from each of Sir Shelly's lookouts (same order as the world's views).
export const VIEWS: string[] = [
  'From the old woods you can see the whole village, tiny as a toy. Deep breath in... and out.',
  'Wind off the meadow cliffs. The waves go in, the waves go out. No hurry at all.',
  'The cove is so quiet you can hear your own heartbeat. It sounds happy.',
  'Past the glade, the sea goes on forever. Somewhere out there, another yeti is waving.',
  'Below the orchard, the whole island is blossoming. You did a lot of walking to get here. Proud of you.',
]

export const NAP = {
  day: { text: 'Home, sweet home. The bed looks very fluffy. Nap until the moon is up?', choice: 'Nap until night' },
  night: { text: 'Home, sweet home. Time to sleep until morning?', choice: 'Sleep until morning' },
  woke: ['Yettie wakes up well-rested.', 'What a lovely nap!'],
}

export const DOORS: Record<string, string> = {
  broc: 'The door is warm. Something smells like soup in there.',
  avo: "Locked. A little note says: 'Gone jamming.'",
  mama: 'Home! Smells like cookies and cozy blankets.',
}

export const FORTUNES = [
  'You will drink a glass of water very soon. Bold prediction.',
  'A vegetable will bring you joy today.',
  'Your next nap will be legendary.',
  "Someone thinks your fluff is perfect. (It's Pip.)",
  'Stretch a little. Your future self says thanks.',
  'A great snack is in your near future. Probably a carrot.',
  'You are exactly as fluffy as you need to be.',
  'Good things come to those who walk.',
  'The fountain foresees... a high five. Go find someone.',
]
