// Room and player names: random suggestions like "Swift Comet", and cleaning up
// names people type. Shared by the game (to suggest one) and the server (to check it).

export const MAX_ROOM_NAME = 24;
export const MAX_PLAYER_NAME = 16;

const ADJECTIVES = ['Swift', 'Quiet', 'Bright', 'Lucky', 'Brave', 'Calm', 'Neon', 'Rapid', 'Silver', 'Golden', 'Cosmic', 'Wild'];
const NOUNS = ['Comet', 'Falcon', 'Otter', 'Pixel', 'Rocket', 'Tiger', 'Wave', 'Ember', 'Nova', 'Panda', 'Echo', 'Spark'];
const pick = (words) => words[Math.floor(Math.random() * words.length)];

// taken: names already in use, to avoid when possible
export function randomRoomName(taken = new Set()) {
  let name;
  for (let tries = 0; tries < 20; tries++) {
    name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    if (!taken.has(name)) break;
  }
  return name;
}

// The same words make fine player names too, like "Lucky Panda"
export const randomPlayerName = () => randomRoomName();

// Trims a typed name, drops invisible control characters, squeezes spaces and
// cuts it to length. Returns '' if nothing is left.
function cleanName(raw, maxLength) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/\p{C}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

export const cleanRoomName = (raw) => cleanName(raw, MAX_ROOM_NAME);
export const cleanPlayerName = (raw) => cleanName(raw, MAX_PLAYER_NAME);
