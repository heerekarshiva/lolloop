-- Migration 004: All 50 Original 3D Games for LOLLOOP
-- Categories: arcade, puzzle, multiplayer, adventure, funny

insert into public.games (slug, name, category, description) values
  -- CATEGORY A – ARCADE GAMES (1-10)
  ('jump-rush', 'Jump Rush', 'arcade', '3D endless platform jumping. Leap over rotating hurdles, avoid chasms, and build massive speed combos.'),
  ('brick-smash', 'Brick Smash', 'arcade', 'High-energy 3D breakout! Shatter vibrant voxel bricks with realistic physics reflections and multi-ball powerups.'),
  ('bubble-pop', 'Bubble Pop', 'arcade', 'Immersive 3D bubble popping in an aquatic dome. Chain pops together before the rising tide fills the chamber.'),
  ('slice-master', 'Slice Master', 'arcade', 'Precision 3D slicing action! Carve flying wooden blocks, fruits, and crystals in mid-air while avoiding explosive bombs.'),
  ('bounce-mania', 'Bounce Mania', 'arcade', '3D vertical helix drop! Guide a bouncing metallic sphere through spinning hazard plates and smash through green boosters.'),
  ('traffic-escape', 'Traffic Escape', 'arcade', 'High-speed 3D highway rush! Weave between lanes, dodge oncoming trucks, slipstream sports cars, and hit the nitro ramps.'),
  ('whack-attack', 'Whack Attack', 'arcade', 'Next-gen 3D carnival mallet arcade! Slam fast-popping robotic moles, hit golden bonus targets, and dodge dynamite.'),
  ('block-drop', 'Block Drop', 'arcade', '3D polyomino block stacking! Rotate falling isometric polyominoes, clear complete line layers, and trigger cascading combos.'),
  ('space-defender', 'Space Defender', 'arcade', 'Cockpit-view 3D sci-fi starfighter battle! Blast waves of pirate drones, shatter tumbling asteroids, and defend the orbital station.'),
  ('sky-hopper', 'Sky Hopper', 'arcade', 'Isometric 3D cloud island hopper! Leap across floating stepping stones that crumble underfoot, collect cloud coins, and reach the floating castle.'),

  -- CATEGORY B – PUZZLE & BRAIN GAMES (11-20)
  ('number-merge', 'Number Merge', 'puzzle', 'Physical 3D 2048 dice launcher! Aim and shoot numbered dice into a kinetic arena where matching numbers collide and fuse.'),
  ('sudoku-sprint', 'Sudoku Sprint', 'puzzle', 'Fast-paced 3D Sudoku with tactile wood and stone blocks. Fill in missing numbers across 9x9 grids against the clock.'),
  ('memory-match', 'Memory Match', 'puzzle', 'Immersive 3D memory chamber! Step between glowing pedestals, flip holographic cards, and match geometric glyphs.'),
  ('slide-it', 'Slide It', 'puzzle', 'Tactile 3D sliding puzzle with realistic wood grain and satisfying snap-in physics. Slide tiles to reveal intricate artwork.'),
  ('maze-runner', 'Maze Runner', 'puzzle', 'Tilt and guide a glowing energy orb through a twisting 3D marble labyrinth. Find 3 glowing keys and unlock the exit gate.'),
  ('connect-quest', 'Connect Quest', 'puzzle', '3D energy conduit puzzle! Rotate pipe nodes and laser prisms to route pulsating currents from the core to activate power terminals.'),
  ('match-mania', 'Match Mania', 'puzzle', 'Chaotic 3D object sorting! Pick matching trios of toys, sports gear, and tech from a physics-simulated bowl before time expires.'),
  ('spot-the-change', 'Spot the Change', 'puzzle', 'Inspect two twin 3D diorama rooms! Rotate and zoom the camera to spot 5 subtle shifts in lighting, furniture, and hidden props.'),
  ('logic-lock', 'Logic Lock', 'puzzle', 'Crack the 3D bank vault combination lock! Rotate metallic dials, listen for acoustic click cues, and deduce the secret numeric code.'),
  ('word-hunter', 'Word Hunter', 'puzzle', 'Orbit around a 3D spherical word sphere! Link connected letter nodes in 3D space to hunt hidden dictionary words.'),

  -- CATEGORY C – MULTIPLAYER GAMES (21-30)
  ('tic-tac-toe', 'Tic Tac Toe Battle', 'multiplayer', '3D holographic grid duel! Drop glowing neon X and O tokens into an arena against online players or intelligent AI bots.'),
  ('duo-dash', 'Duo Dash', 'multiplayer', 'Side-by-side 3D hurdle dash! Race against friends or rubber-banding AI competitors across obstacle courses with jump pads and speed gates.'),
  ('quiz-royale', 'Quiz Royale', 'multiplayer', 'Live 3D TV gameshow set! Stand behind interactive buzzers, step under spotlights, and out-answer opponents in fast-paced trivia.'),
  ('tap-war', 'Tap War', 'multiplayer', 'Frantic 3D tug-of-war! Mash your button faster than your rival to drag the heavy golden idol into your team territory.'),
  ('rock-paper-clash', 'Rock Paper Clash', 'multiplayer', 'Real-time 3D rock-paper-scissors arena! Select your elemental avatar form and outpredict your rival in best-of-5 rounds.'),
  ('four-in-a-row', 'Four in a Row', 'multiplayer', 'Drop weighted discs into a 3D vertical Connect-4 grid. Form horizontal, vertical, or diagonal lines before your rival does.'),
  ('pong-rivals', 'Pong Rivals', 'multiplayer', 'Ultra-fast 3D cyber pong! Angle your paddle, apply ball curve spins, and out-rally your rival across a neon grid table.'),
  ('snake-arena', 'Snake Arena', 'multiplayer', 'Competitive 3D slither battle! Navigate a growing snake, devour glowing energy pellets, and cut off competing snakes.'),
  ('draw-guess', 'Draw & Guess', 'multiplayer', 'Voxel sculpting studio! Build 3D block sculptures block-by-block while friends and AI bots guess the secret word in real time.'),
  ('mini-battle-arena', 'Mini Battle Arena', 'multiplayer', '3D bumper car sumo brawl! Ram opponents, collect rocket dash powerups, and shove rivals off the floating hexagonal platform.'),

  -- CATEGORY D – ADVENTURE & COOPERATIVE GAMES (31-40)
  ('you-and-me', 'You & Me', 'adventure', 'LOLLOOP signature 2-player cooperative 3D adventure! Control Ember (Fire) and Glacio (Ice) through 5 worlds to solve puzzles and escape together.'),
  ('escape-together', 'Escape Together', 'adventure', 'Synchronized 3D bunker escape! Coordinate with your teammate to pull simultaneous wall levers and open blast doors.'),
  ('jungle-quest', 'Jungle Quest', 'adventure', 'Explore ancient 3D Mayan jungle ruins! Leap over crumbling spike pits, outrun rolling boulders, and retrieve the golden sun idol.'),
  ('treasure-hunt', 'Treasure Hunt', 'adventure', '3D tropical island metal detector expedition! Follow audio signal beeps, dig up buried chests, and discover pirate gold.'),
  ('castle-escape', 'Castle Escape', 'adventure', 'Navigate a dark 3D gothic keep! Evade swinging pendulum scythes, time gate lifts, and flee before the drawbridge closes.'),
  ('space-buddies', 'Space Buddies', 'adventure', 'Zero-gravity 3D spacewalk tether! Work together to realign orbital antennas and repair solar panels while managing oxygen.'),
  ('ocean-explorer', 'Ocean Explorer', 'adventure', 'Deep sea submarine 3D exploration! Navigate undersea trench caverns with searchlights, collect rare pearls, and dodge anglerfish.'),
  ('island-survival', 'Island Survival', 'adventure', 'Castaway island 3D crafting! Gather bamboo, chop driftwood, avoid incoming rogue waves, and assemble an escape raft.'),
  ('robo-rescue', 'Robo Rescue', 'adventure', 'Infiltrate a high-tech security facility! Hack terminals, disable laser barriers, and guide trapped mini-bots to the evacuation portal.'),
  ('haunted-escape', 'Haunted Escape', 'adventure', 'Explore an eerie 3D Victorian manor! Shine your flashlight, locate ancient protective talismans, and evade the roaming shadow phantom.'),

  -- CATEGORY E – FUNNY & PARTY GAMES (41-50)
  ('reaction-master', 'Reaction Master', 'funny', 'Lightning reflex party test! Watch for the randomized visual flash and buzz in within milliseconds. False starts are penalized!'),
  ('wrong-answer-wins', 'Wrong Answer Wins', 'funny', 'Absurd comedy trivia gameshow! The correct answer is always disqualified—pick the funniest trick answers to win points.'),
  ('dont-press-it', 'Don''t Press It', 'funny', 'The Forbidden 3D Red Button taunts you with hilarious voices and animations. Resist pressing it for 30 seconds to win!'),
  ('crazy-wheel', 'Crazy Wheel', 'funny', 'Spin the giant 3D carnival wheel of fortune with authentic physical momentum, realistic clickers, and hilarious dares.'),
  ('dont-fall', 'Don''t Fall', 'funny', 'Hex-a-gone collapsing floor party brawl! Run across 3 tiers of vanishing hex tiles and be the last player standing.'),
  ('dodge-master', 'Dodge Master', 'funny', 'Bullet-hell comedy arena! Dodge flying cream pies, oversized beach balls, and flying rubber chickens hurled at your avatar.'),
  ('emoji-mystery', 'Emoji Mystery', 'funny', 'Decipher floating 3D rebus puzzles made of oversized emojis. Guess popular movies, songs, and memes against the clock.'),
  ('balloon-burst', 'Balloon Burst', 'funny', 'High-tension 3D helium pump risk-vs-reward party game! Pump the giant balloon for maximum points before it pops in your face!'),
  ('crazy-chef', 'Crazy Chef', 'funny', 'Fast-paced 3D diner kitchen madness! Catch falling burger patties, buns, and cheese slices on your plate while dodging rotten fish.'),
  ('animal-race', 'Animal Race', 'funny', '3D wacky animal derby! Choose your goofy animal (waddling penguin, hopping frog, rolling panda, hyper puppy) and race to glory.')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description;
