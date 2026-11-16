/**
 * Background music for both sites. Put the audio file in public/music/ with this name
 * (or change the path), and set its title; it shows as the button's tooltip.
 * The song loops. To add more songs, add more entries; they play in order.
 */
export const music = {
  /** 0 to 1. Kept low so it sits behind the page. */
  volume: 0.5,
  /** `start` (seconds, optional) skips the song's opening, on first play and every time it loops. */
  tracks: [{ title: "Revival Chant II (Dunsin Oyekan)", src: "/music/revival-chant-ii.m4a", start: 15 }] as { title: string; src: string; start?: number }[],
};
