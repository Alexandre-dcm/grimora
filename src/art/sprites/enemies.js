import { shape } from "../Shape.js";

/**
 * BESTIARY — hand-authored pixel grids, one per enemy id in data/enemies.js.
 *
 * Every creature must be nameable from silhouette alone (ART_BIBLE §8).
 * `rig.type` selects the animation recipe used by Rigger:
 *   biped | heavy | quadruped | blob | flyer | floater
 * `rig.bands` gives [headEnd, bodyEnd] row indices; legs are the remainder.
 *
 * Pure data — no DOM.
 */

/* ------------------------------- SLIME ------------------------------- */
// Wide dome, narrow crown, translucent highlight, two dark eyes.
const slime = [
  "........................",
  "..........0000..........",
  "........00xxxx00........",
  ".......0xxzzzzxx0.......",
  "......0xxzzzzzzxx0......",
  ".....0xxzz99zzzzxx0.....",
  ".....0xxzz99zzzzxx0.....",
  "....0wxxzzzzzzzzxxw0....",
  "....0wwxx00zz00xxww0....",
  "...0wwwxx00zz00xxwww0...",
  "...0wwwwxxzzzzxxwwww0...",
  "..0wwwwwwxxzzxxwwwwww0..",
  "..0ywwwwwwxxxxwwwwwwy0..",
  ".0yywwwwwwwwwwwwwwwwyy0.",
  ".0yyywwwwwwwwwwwwwwyyy0.",
  ".0yyyyywwwwwwwwwwyyyyy0.",
  ".0yyyyyyyyyyyyyyyyyyyy0.",
  ".0000000000000000000000.",
];

/* -------------------------------- RAT -------------------------------- */
// Low, long, snout and ear to the right, bare tail curling left.
const rat = [
  "......................",
  "................00....",
  "...............0bb0...",
  "..........00000bbb0...",
  ".........0bbbbbbbcb0..",
  "........0bbbbbbbccl00.",
  ".......0abbbbbbbcccb0.",
  "..00...0abbbbbbbbbbb0.",
  ".0I0..0aabbbbbbbbbb00.",
  "0I0..0aaabbbbbbbbb0...",
  ".0I00aaaabbbbbbbb0....",
  "..0IIaaa0bb00bb00.....",
  "...000000ab0.ab0......",
  ".........000.000......",
];

/* -------------------------------- BAT -------------------------------- */
// Wide membranous wings, tiny body, big ears.
const bat = [
  "........................",
  "..0..............0......",
  ".0F0...0000....0F0......",
  ".0FF00FFFFFF00FFF0......",
  "0FFFFFFEEEEFFFFFFF0.....",
  "0EFFFFF0ll0FFFFFFE0.....",
  ".0EEFF00FF00FFFEE0......",
  "..00EFFFEEFFFEE00.......",
  ".....0EFFEEFFE0.........",
  "......0EE00EE0..........",
  ".......0E00E0...........",
  "........0000............",
];

/* ------------------------------ GOBLIN ------------------------------- */
// Huge pointed ears, hunched, dagger in the right hand.
const goblin = [
  "....................",
  ".....0000000........",
  "..0..0xwwwx0..0.....",
  ".0w00wwwwwww00w0....",
  ".0ww0w0ll0w0ww0.....",
  "..0wwwwwwwwwww0.....",
  "...0ww0000ww0.......",
  "...0wwwwwwww0.......",
  "..0bbb0ww0bbb0......",
  ".0bcb0wwww0bcb00....",
  ".0bcb0wwww0bcb0h0...",
  ".0bbb0wwww0bbb0h0...",
  "..00b0aaaa0b000h0...",
  "....0bwwwwwb0.0h0...",
  "....0bwwwwb0..0h0...",
  "....0wwwwww0..0g0...",
  "....0ww00ww0..0f0...",
  "....0ww00ww0..000...",
  "...0aaa00aaa0.......",
  "...0aaa00aaa0.......",
  "....000..000........",
];

/* ----------------------------- SKELETON ------------------------------ */
// Ribcage gaps, hollow skull, notched sword.
const skeleton = [
  "....................",
  "......000000........",
  ".....0NNNNNN0.......",
  "....0NOOOOOON0......",
  "....0N0ll0ll0N0.....",  // hollow eye sockets with red glow
  "....0NOOOOOON0......",
  ".....0N0N0N0N0......",
  "......0NNNN0........",
  "....000NNNN000......",
  "...0NNN0NN0NNN0.....",
  "...0N0N0NN0N0N0..0..",
  "...0N00NNNN00N0.0h0.",
  "...0N0NNNNNN0N0.0h0.",
  "....00N0NN0N00..0h0.",
  "..0NN0N0NN0N0NN00g0.",
  "..0NN00NNNN00NN0fg0.",
  "...00.0NNNN0.00.0f0.",
  "......0NN0NN0...0c0.",
  "......0N0.0N0...000.",
  "......0N0.0N0.......",
  ".....0NN0.0NN0......",
  ".....0NN0.0NN0......",
  "....0NNN0.0NNN0.....",
  ".....000...000......",
];

/* ------------------------------ ZOMBIE ------------------------------- */
// Asymmetric slump, one arm hanging forward, exposed ribs.
const zombie = [
  "......................",
  ".......000000.........",
  "......0wwvvww0........",
  ".....0wvvvvvvw0.......",
  ".....0w0ll0l0w0.......",
  ".....0wvvvvvvw0.......",
  "......0wv00vw0........",
  "......0wvvvvw0........",
  "....000wvvvw000.......",
  "...0IJ0wvvvw0vw0......",
  "...0IJ0wvNvw0vw0......",
  "...0IJ0wNNNw0vw0......",
  "...0IJ0wvNvw0vw0......",
  "...0IJ0wvvvw0vw0......",
  "...0IJ0wvvvw00v0......",
  "...0LJ0wvvvw0.000.....",
  "...0LJ00vvv00.........",
  "....000wvvw0..........",
  "......0wv0vw0.........",
  "......0v0.0v0.........",
  ".....0vv0.0vv0........",
  ".....0IJ0.0IJ0........",
  "....0III0.0III0.......",
  ".....000...000........",
];

/* ------------------------------ SPIDER ------------------------------- */
// Eight stepped legs, bulbous abdomen, cluster of red eyes.
const spider = [
  "........................",
  "..0..................0..",
  ".0a0................0a0.",
  ".0a00..............00a0.",
  "..0aa0....0000....0aa0..",
  "...0aa0..0aaaa0..0aa0...",
  "0...0aa00abbbba00aa0...0",
  "0a...0aa0bbbbbb0aa0...a0",
  "0aa...0a0bl00lb0a0...aa0",
  ".0aa..00abbbbbba00..aa0.",
  "..0aa0.0aabbbbaa0.0aa0..",
  "...0aa0.0aa00aa0.0aa0...",
  "....0a0..0abba0..0a0....",
  "....0a0.0abbbba0.0a0....",
  "...0a0.0aabbbbaa0.0a0...",
  "...0a0.0abbbbbba0.0a0...",
  "...000.0aabbbbaa0.000...",
  "........0aabbaa0........",
  ".........0aaaa0.........",
  "..........0000..........",
];

/* -------------------------------- WOLF -------------------------------- */
// Four legs, low head, spine ridge, facing right.
const wolf = [
  "..........................",
  "..0.................00....",
  ".0400..............0440...",
  ".04400............044440..",
  "..0440000000000004444440..",
  "...04444444444444444ll40..",
  "...0555444444444444440400.",
  "..0555555444444444444404..",
  ".05555555555444444440000..",
  ".05555555555555544440.....",
  ".04555555555555555440.....",
  ".044055555555555044400....",
  ".040.04405555044.04440....",
  "0400.0440.0440....0440....",
  "0440.0440.0440....0440....",
  "0440.0400.0440....0440....",
  "0400.000..0400....0400....",
  "000.......000.....000.....",
];

/* --------------------------- SKELETON ARCHER -------------------------- */
// Bone frame plus a tall bow arc.
const archer = [
  "....................",
  "......000000...00...",
  ".....0NNNNNN00c00...",
  "....0NOOOOOON0c0....",
  "....0N0ll0ll0Nc0....",
  "....0NOOOOOONc0.....",
  ".....0N0N0N0Nc0.....",
  "......0NNNN0c0......",
  "....000NNNN0c0......",
  "...0NNN0NN00c0......",
  "...0N0N0NN0Nc0......",
  "...0N00NNNN0c0......",
  "...0N0NNNNNNc0......",
  "....00N0NN0Nc0......",
  "..0NN0N0NN0Nc0......",
  "..0NN00NNNN0c0......",
  "...00.0NNNN0c0......",
  "......0NN0NNc0......",
  "......0N0.0N0.......",
  "......0N0.0N0.......",
  ".....0NN0.0NN0......",
  ".....0NN0.0NN0......",
  "....0NNN0.0NNN0.....",
  ".....000...000......",
];

/* ------------------------------ CULT MAGE ----------------------------- */
// Tall pointed hood, no face — only two arcane sparks. Staff with crystal.
const mage = [
  "....................",
  "........00..........",
  ".......0FG0.........",
  ".......0FG0....00...",
  "......0FFGG0..0HT0..",
  "......0FFGG0..0TH0..",
  ".....0FFFGGG0..00...",
  ".....0FFFGGG0.0c0...",
  "....0FFF00GGG0c0....",
  "....0FF0TT0GG0c0....",  // glowing eyes
  "....0FFF00GGG0c0....",
  "...0FFFFGGGGGGc0....",
  "...0FFFFGGGGGG0c0...",
  "..0FFFFFGGGGGGG0c0..",
  "..0FFFFFGGGGGGG00c0.",
  ".0FFFFFFGGGGGGGG0c0.",
  ".0FFFFFFGGGGGGGG0c0.",
  ".0FFFFFFFGGGGGGG00..",
  "0FFFFFFFFGGGGGGGG0..",
  "0FFFFFFFFGGGGGGGG0..",
  "0EFFFFFFFGGGGGGGE0..",
  "0EEEFFFFFGGGGGEEE0..",
  ".0EEEEEEEEEEEEEE0...",
  "..00000000000000....",
];

/* ------------------------------ ORC BRUISER ---------------------------- */
// Massive shoulders, tusks, spiked club.
const orc = [
  "............................",
  "........0000000.............",
  "......00wwwwwww00...........",
  ".....0wwwwwwwwwww0..........",
  ".....0ww0ll00ll0ww0.........",
  ".....0wwwwwwwwwwww0.........",
  "....0Owwwww00wwwwwO0........",
  "....00ww0OO00OO0ww00........",
  "...0vv0wwwwwwwwww0vv0..0d0..",
  "..0vvv0wwwwwwwwww0vvv00ddd0.",
  "..0vvvv0wwwwwwww0vvvv0d0d0d0",
  "..0vvvv0wwwwwwww0vvvv0ddddd0",
  "..0vvvv0wwwwwwww0vvvv00ddd0.",
  "..0vvvv0wwwbbwww0vvvv0.0c0..",
  "...0vvv0wwbbbbww0vvv0..0c0..",
  "...0vvv0wwwbbwww0vvv0..0c0..",
  "...0vv00wwwwwwww00vv0..0c0..",
  "....000wwwwwwwwww000...000..",
  "......0wwwbbbbwww0..........",
  "......0wwbb00bbww0..........",
  ".....0wwwb0..0bwww0.........",
  ".....0www0....0www0.........",
  ".....0www0....0www0.........",
  "....0wwww0....0wwww0........",
  "....0aaaa0....0aaaa0........",
  "....0aaaa0....0aaaa0........",
  ".....0000......0000.........",
];

/* --------------------------- SHADOW ASSASSIN -------------------------- */
// Thin hooded silhouette, crimson sash, twin daggers held point-down.
const assassin = shape(20, 26, (s) => {
  const C = 10;
  // legs
  s.symBox(5, 18, 3, 6, "2");
  s.symBox(4, 23, 5, 2, "1");
  // robe
  s.taper(C, 8, 12, 10, 12, "3");
  s.taper(C, 9, 10, 6, 8, "4");
  // arms
  s.box(2, 9, 3, 8, "2");
  s.box(15, 9, 3, 8, "2");
  // hood
  s.taper(C, 1, 4, 6, 10, "3");
  s.box(5, 4, 10, 6, "3");
  s.taper(C, 1, 3, 4, 8, "4");
  s.box(5, 4, 3, 5, "4");
  // eye slit
  s.box(6, 6, 8, 2, "0");
  s.box(6, 6, 2, 1, "l");
  s.box(12, 6, 2, 1, "l");
  // sash + trailing tail
  s.box(4, 9, 12, 2, "j");
  s.box(4, 15, 12, 2, "j");
  s.box(16, 11, 3, 5, "i");
  s.box(17, 15, 2, 3, "i");
  // daggers
  s.box(1, 13, 2, 7, "h");
  s.box(1, 11, 2, 2, "b");
  s.box(17, 13, 2, 7, "h");
  s.box(17, 11, 2, 2, "b");
  s.outline("0");
  s.contact("1", 4);
});

/* --------------------------- FALLEN KNIGHT ---------------------------- */
// Full helm with a visor slit, kite shield, heavy plate.
const knight = [
  "..........................",
  ".........000000...........",
  "........0gggggg0..........",
  ".......0ghhhhhhg0.........",
  ".......0gh0000hg0.........",
  ".......0ghllllhg0.........",  // visor glow
  ".......0ghhhhhhg0.........",
  "........0gffffg0..........",
  "......0000gggg0000........",
  ".....0ggg0gggg0ggg0.......",
  "....0hgg00gggg00ggh0..00..",
  "....0hg0ffgggggff0gh0.0h0.",
  "....0hg0fggggggf0ggh0.0h0.",
  "....0gg0fggggggf0ggg0.0h0.",
  "...0egg0fgg00ggf0gge0.0g0.",
  "...0egg0fg0hh0gf0gge0.0g0.",
  "...0egg0fg0hh0gf0gge0.0f0.",
  "...00g00fgg00ggf00g00.0f0.",
  "....00000fgggggf00000.000.",
  "........0fgggggf0.........",
  ".......0ffgg0ggff0........",
  ".......0fg00.00gf0........",
  ".......0fg0...0gf0........",
  "......0ffg0...0gff0.......",
  "......0eee0...0eee0.......",
  "......0eee0...0eee0.......",
  ".......000.....000........",
];

/* --------------------------- BLOOD CULTIST ---------------------------- */
// Narrow robe, pale horned bone mask, a blood rune orbiting one hand.
const cultist = shape(20, 28, (s) => {
  const C = 10;
  // robe
  s.taper(C, 12, 14, 12, 16, "i");
  s.taper(C, 13, 12, 8, 11, "j");
  s.box(C - 1, 14, 2, 12, "k");
  // sleeves
  s.box(1, 13, 4, 9, "i");
  s.box(15, 13, 4, 9, "i");
  s.box(1, 21, 4, 3, "j");
  s.box(15, 21, 4, 3, "j");
  // hood
  s.taper(C, 2, 5, 6, 12, "i");
  s.box(4, 6, 12, 7, "i");
  s.box(4, 6, 3, 6, "j");
  // bone mask
  s.box(6, 7, 8, 6, "N");
  s.box(7, 8, 6, 4, "O");
  s.box(7, 9, 2, 2, "0");
  s.box(11, 9, 2, 2, "0");
  s.box(9, 11, 2, 2, "0");
  // horns
  s.box(5, 3, 2, 4, "N");
  s.box(13, 3, 2, 4, "N");
  s.box(4, 1, 2, 3, "O");
  s.box(14, 1, 2, 3, "O");
  // floating rune
  s.box(16, 8, 3, 3, "l");
  s.px(17, 9, "Q");
  s.outline("0");
  s.contact("1", 4);
});

/* --------------------------- WAILING GHOST ---------------------------- */
// No legs: an elongated wraith with a torn, dissolving hem and a wailing maw.
const ghost = shape(22, 26, (s) => {
  const C = 11;
  s.taper(C, 2, 8, 10, 16, "C");
  s.box(3, 10, 16, 9, "C");
  s.taper(C, 3, 7, 8, 12, "D");
  s.box(5, 10, 12, 6, "D");
  s.box(3, 16, 16, 3, "B");
  // tattered hem
  s.box(4, 19, 3, 4, "B");
  s.box(9, 19, 3, 6, "B");
  s.box(14, 19, 3, 3, "B");
  s.box(9, 19, 3, 2, "C");
  s.dither(3, 21, 16, 4, ".", 1, true);
  // hollow face
  s.box(7, 6, 3, 4, "0");
  s.box(12, 6, 3, 4, "0");
  s.box(9, 12, 4, 4, "0");
  // reaching arms
  s.box(1, 11, 3, 6, "C");
  s.box(18, 11, 3, 6, "C");
  s.box(1, 11, 3, 2, "D");
  s.box(18, 11, 3, 2, "D");
  s.outline("0");
});

/* --------------------------- LESSER DEMON ----------------------------- */
// Horns, batwings, tail, hooves, ember cracks.
const demon = [
  "............................",
  "...00..............00.......",
  "..0m0..............0m0......",
  "..0n0....000000....0n0......",
  "..0n00..0nnnnnn0..00n0......",
  "...0n00nnnnnnnnnn00n0.......",
  "....0nnnn0pp00pp0nnn0.......",  // burning eyes
  "....0nnnnnnnnnnnnnn0........",
  "....0nnnnn0nn0nnnnn0........",
  "..000nnnnnn00nnnnnn000......",
  ".0m0nnnnnnnnnnnnnnnn0m0.....",
  "0mm0nnnnmmnnnnmmnnnn0mm0....",
  "0mn0nnnnmpmnnmpmnnnn0nm0....",
  "0mn0nnnnnmmnnmmnnnnn0nm0..00",
  "0mn00nnnnnnnnnnnnnn00nm0.0m0",
  ".0mn0nnnnnnnnnnnnnn0nm0..0m0",
  "..0m00nnnnnnnnnnnn00m0..0m00",
  "...000nnnnmmmmnnnn000..0m0..",
  "......0nnnm00mnnn0....0m0...",
  "......0nnn0..0nnn0...0m0....",
  ".....0nnn0....0nnn0.0m0.....",
  ".....0nnn0....0nnn0.00......",
  "....0mmmm0....0mmmm0........",
  "....0mmmm0....0mmmm0........",
  "...0mm00mm0..0mm00mm0.......",
  "...000..000..000..000.......",
];

/* ---------------------------- STONE GOLEM ----------------------------- */
// Stacked masonry: two boulder shoulders, a small head, a molten core.
const golem = shape(36, 32, (s) => {
  const C = 18;
  // legs
  s.symBox(9, 24, 7, 6, "4");
  s.symBox(10, 24, 4, 5, "5");
  s.symBox(8, 29, 9, 2, "3");
  // torso, coursed like a wall
  s.box(C - 9, 12, 18, 13, "5");
  s.box(C - 8, 13, 16, 11, "6");
  s.box(C - 9, 12, 18, 1, "7");
  s.box(C - 9, 17, 18, 1, "4");
  s.box(C - 9, 21, 18, 1, "4");
  s.box(C - 3, 12, 1, 5, "4");
  s.box(C + 3, 18, 1, 3, "4");
  // molten core
  s.box(C - 3, 18, 6, 4, "n");
  s.box(C - 2, 19, 4, 2, "o");
  s.box(C - 1, 19, 2, 1, "p");
  // boulder shoulders
  s.symBox(2, 9, 9, 9, "5");
  s.symBox(3, 10, 7, 7, "6");
  s.symBox(3, 9, 7, 1, "7");
  s.symBox(2, 16, 9, 2, "4");
  // arms
  s.symBox(3, 18, 7, 8, "5");
  s.symBox(4, 19, 4, 6, "6");
  s.symBox(3, 24, 7, 1, "4");
  // fists
  s.symBox(2, 25, 9, 6, "4");
  s.symBox(3, 26, 6, 4, "5");
  // head
  s.box(C - 4, 4, 8, 8, "5");
  s.box(C - 3, 5, 6, 6, "6");
  s.box(C - 3, 4, 6, 1, "7");
  s.box(C - 4, 7, 8, 2, "0");
  s.box(15, 7, 2, 2, "l");
  s.box(19, 7, 2, 2, "l");
  // cracks
  s.step(13, 14, 3, 2, 1, 1, "4");
  s.step(22, 20, 2, 2, 1, 1, "4");
  s.outline("0");
  s.contact("1", 7);
});

/* ---------------------------- FROST GOLEM ----------------------------- */
// Same mass, ice shards erupting from the back, frozen core.
const frostGolem = [
  "....................................",
  "..............000000................",
  ".00..........0BBBBB0..........00....",
  "0D0.........0BCCCCCB0........0D0....",
  "0D00........0BC00CB0.........00D0...",
  "0DD0........0BCDDCB0........0DD0....",
  ".0DD00......0BBBBBB0......00DD0.....",
  "..0BDD0.....0BBBBBB0.....0DDB0......",
  "...0BBB00..00BBBBBB00..00BBB0.......",
  "....0BBBB00BBBBBBBBBB00BBBB0........",
  "..0000BBBBBBBBBBBBBBBBBBBB0000......",
  ".0BBBBBBBBBBBBBBBBBBBBBBBBBBBB0.....",
  "0BBCCCCBBBBBBBBBBBBBBBBBCCCCBB0.....",
  "0BCCCCCCBBBBBDDDDBBBBBCCCCCCCB0.....",
  "0BCCCCCCBBBBDDTTDDBBBBCCCCCCCB0.....",
  "0BBCCCCBBBBBDDTTDDBBBBBCCCCBB00.....",
  ".0BBBBBBBBBBBDDDDBBBBBBBBBBB0.......",
  "..0ABBBBBBBBBBBBBBBBBBBBBBA0........",
  "...0AABBBBBBBBBBBBBBBBBBAA0.........",
  "....0AAABBBBBBBBBBBBBBAAA0..........",
  ".....000BBBBBBBBBBBBB000............",
  "........0BBBBB00BBBBB0..............",
  "........0BBBBB00BBBBB0..............",
  "........0ABBBB00BBBBA0..............",
  "........0AABBB00BBBAA0..............",
  ".......0AAABBB00BBBAAA0.............",
  ".......0AAAAB0..0BAAAA0.............",
  ".......0AAAAA0..0AAAAA0.............",
  "........00000....00000..............",
];

/* ----------------------------- VOID WRAITH ---------------------------- */
// Fractured body with detached floating fragments.
const voidWraith = [
  "........................",
  "..0..........00.........",
  ".0G0........0GG0........",
  "..0.......00GGGG00......",
  ".........0GHHHHHHG0.....",
  ".........0GH0GG0HG0.....",  // void eyes
  ".........0GHHHHHHG0.....",
  "..........0GHHHHG0......",
  "....00.....0GGGG0....00.",
  "...0G0....00GGGG00..0G0.",
  "....0....0GGGGGGGG0..0..",
  "........0FGGGGGGGGF0....",
  "........0FGGGGGGGGF0....",
  ".......0FFGGGGGGGGFF0...",
  ".......0FFGGGGGGGGFF0...",
  "..0.....0FFGGGGGGFF0..0.",
  ".0G0.....0FFGGGGFF0..0G0",
  "..0.......0FFGGFF0....0.",
  "...........0FGGF0.......",
  "...........0F00F0.......",
  "............0F0F0.......",
  ".............000........",
  "........................",
  "........................",
];

/* -------------------------------- MIMIC ------------------------------- */
// A chest with a mouthful of teeth and a lolling tongue.
const mimic = [
  "............................",
  "....0000000000000000000.....",
  "...0ddddddddddddddddddd0....",
  "..0dccccccccccccccccccdd0...",
  "..0dcsssssssssssssssscdd0...",
  "..0dccccccccccccccccccdd0...",
  "..0dOO0OO0OO0OO0OO0OO0dd0...",  // upper teeth
  "..0dcccccccccccccccccccd0...",
  "..0dcckkkkkkkkkkkkkkccdd0...",
  "..0dcckklllllllllkkkccdd0...",  // maw
  "..0dcckkllllllllllkkccdd0...",
  "..0dcckkllllllllllkkccdd0...",
  "..0dccckkkllllllkkkcccdd0...",
  "..0dcOO0OO0OO0OO0OO0Ocdd0...",  // lower teeth
  "..0dcccccccccccccccccccd0...",
  "..0dcccssssssssssscccddd0...",
  "..0dccccccc0ss0cccccccdd0...",
  "..0dcccccccssssccccccddd0...",
  "..0dccccccccccccccccccd0....",
  "...0aaaaaaaaaaaaaaaaaa0.....",
  "....000000000000000000......",
  "..0a0..0a0......0a0..0a0....",
  "..000..000......000..000....",
  "............................",
];

/* ------------------------------ FIRE IMP ------------------------------ */
// Small, horned, flame crown, tiny wings.
const fireImp = [
  "..................",
  ".....0p0..........",
  "..0..0p0..0.......",
  ".0m0.0o0.0m0......",
  ".0n00ooo00n0......",
  "..0nnooonn0.......",
  "..0nnpppnn0.......",
  ".0nnn0pp0nnn0.....",
  ".0nnnppppnnn0.....",
  "0m0nn0pp0nn0m0....",
  "0mn0nnnnnn0nm0....",
  "0mn0nnmmnn0nm0....",
  ".0m0nnmmnn0m0.....",
  "..00nnnnnn00......",
  "...0nn00nn0.......",
  "...0nn..nn0.......",
  "..0mm0..0mm0......",
  "..000....000......",
];

/* ------------------------------ ICE SHADE ----------------------------- */
// Angular, crystalline, hollow torso.
const iceShade = [
  "......................",
  "........0000..........",
  ".......0BCCB0.........",
  "......0BCDDCB0........",
  "......0C0TT0C0........",  // frozen eyes
  "......0BCDDCB0........",
  ".......0BCCB0.........",
  "....000.0BB0.000......",
  "...0DB0.0BB0.0BD0.....",
  "..0DCB00BCCB00BCD0....",
  "..0DCBBBCDDCBBBCD0....",
  "..0DCB0BCDDCB0BCD0....",
  "...0CB0BC00CB0BC0.....",
  "....00.0C00C0.00......",
  ".......0C00C0.........",
  ".......0CDDC0.........",
  "......0BCDDCB0........",
  "......0BC00CB0........",
  ".....0BC0..0CB0.......",
  ".....0B0....0B0.......",
  "....0AB0....0BA0......",
  ".....000....000.......",
];

/* ----------------------------------------------------------------------
 * Registry. `w`/`h` are derived at compile time; `ground` is how many rows
 * from the bottom are the contact shadow (excluded from bob transforms).
 * -------------------------------------------------------------------- */
export const ENEMY_SPRITES = {
  slime:       { rows: slime,       rig: { type: "blob",      bands: [7, 12] } },
  rat:         { rows: rat,         rig: { type: "quadruped", bands: [4, 10], facing: "right" } },
  bat:         { rows: bat,         rig: { type: "flyer",     bands: [2, 7], wings: [0, 1, 24, 8] } },
  goblin:      { rows: goblin,      rig: { type: "biped",     bands: [7, 17] } },
  skeleton:    { rows: skeleton,    rig: { type: "biped",     bands: [8, 17] } },
  zombie:      { rows: zombie,      rig: { type: "biped",     bands: [8, 17], shamble: true } },
  spider:      { rows: spider,      rig: { type: "quadruped", bands: [5, 13], legs8: true } },
  wolf:        { rows: wolf,        rig: { type: "quadruped", bands: [6, 12], facing: "right" } },
  archer:      { rows: archer,      rig: { type: "biped",     bands: [8, 17] } },
  mage:        { rows: mage,        rig: { type: "floater",   bands: [11, 20] } },
  orc:         { rows: orc,         rig: { type: "heavy",     bands: [8, 18] } },
  assassin:    { rows: assassin,    rig: { type: "biped",     bands: [8, 17] } },
  knight:      { rows: knight,      rig: { type: "heavy",     bands: [8, 19] } },
  cultist:     { rows: cultist,     rig: { type: "floater",   bands: [10, 20] } },
  ghost:       { rows: ghost,       rig: { type: "floater",   bands: [10, 18], hem: [17, 21] } },
  demon:       { rows: demon,       rig: { type: "heavy",     bands: [9, 21] } },
  golem:       { rows: golem,       rig: { type: "heavy",     bands: [6, 20] } },
  frost_golem: { rows: frostGolem,  rig: { type: "heavy",     bands: [10, 20] } },
  void_wraith: { rows: voidWraith,  rig: { type: "floater",   bands: [8, 18] } },
  mimic:       { rows: mimic,       rig: { type: "blob",      bands: [7, 18] } },
  fire_imp:    { rows: fireImp,     rig: { type: "flyer",     bands: [7, 13] } },
  ice_shade:   { rows: iceShade,    rig: { type: "floater",   bands: [7, 17] } },
};

/** Fallback for any enemy id that has no bespoke sprite yet. */
export const ENEMY_FALLBACK = "goblin";
