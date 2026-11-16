"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { music } from "@/lib/music";
import "./music.css";

type Music = { playing: boolean; title: string; toggle: () => void; start: () => void };
const MusicContext = createContext<Music | null>(null);

/** Set after the first player in this page load, so only that one treats a refresh as a fresh start. */
let startedBefore = false;

const PREF = "ycw:music"; // localStorage: "off" once the visitor mutes
const SPOT = "ycw:music-at"; // sessionStorage: where the song was, so the other site picks it up

const read = (store: () => Storage, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};
const write = (store: () => Storage, key: string, value: string) => {
  try {
    store().setItem(key, value);
  } catch {
    // Storage blocked: the music still works, it just won't remember.
  }
};

/**
 * The background music player. It sits in the layout shared by the 3D site and the simple view,
 * so switching between them never interrupts the song. Browsers only allow sound after the visitor
 * interacts, so playback starts on their first tap, click or key press (unless they muted it before).
 * A refresh starts the song over; otherwise it carries on from where it was (also across a visit to the RSVP page).
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState(music.tracks[0]?.title ?? "");
  const api = useRef<{ toggle: () => void; start: () => void } | null>(null);

  useEffect(() => {
    const tracks = music.tracks;
    if (!tracks.length) {
      setMissing(true);
      return;
    }

    let index = 0;
    let resumeAt = 0;
    // A refresh restarts the whole site, the song included.
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const refreshed = !startedBefore && nav?.type === "reload";
    startedBefore = true;
    if (!refreshed) {
      try {
        const spot = JSON.parse(read(() => sessionStorage, SPOT) ?? "null") as { i: number; t: number } | null;
        if (spot && spot.i >= 0 && spot.i < tracks.length) [index, resumeAt] = [spot.i, spot.t];
      } catch {
        // Ignore a bad saved spot.
      }
    }

    const audio = new Audio();
    audio.preload = "metadata";
    let failed = 0;
    let fade = 0;
    let wantPlay = false;
    // Where the song should be until the file has loaded and been moved there.
    // Saving reads this instead of currentTime (still 0 while loading), so a quick page switch never loses the spot.
    let pending: number | null = null;

    const load = (i: number, from = 0) => {
      index = i;
      setTitle(tracks[i].title);
      audio.src = tracks[i].src;
      // Never before the song's start point (e.g. skip a long intro).
      const at = Math.max(from, tracks[i].start ?? 0);
      pending = at;
      audio.addEventListener(
        "loadedmetadata",
        () => {
          if (at > 0) audio.currentTime = Math.min(at, audio.duration - 1 || 0);
          pending = null;
        },
        { once: true },
      );
    };

    const position = () => pending ?? audio.currentTime ?? 0;

    // Ease the volume in so the music never starts with a jolt.
    const fadeIn = () => {
      cancelAnimationFrame(fade);
      audio.volume = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 1500);
        audio.volume = music.volume * k * k;
        if (k < 1) fade = requestAnimationFrame(tick);
      };
      fade = requestAnimationFrame(tick);
    };

    const play = () => {
      wantPlay = true;
      fadeIn();
      audio.play().catch(() => {
        // Blocked until the visitor interacts; the first-gesture listener below retries.
      });
    };

    const pause = () => {
      wantPlay = false;
      cancelAnimationFrame(fade);
      audio.pause();
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      load((index + 1) % tracks.length);
      if (wantPlay) play();
    };
    const onError = () => {
      failed += 1;
      if (failed >= tracks.length) {
        setMissing(true);
        return;
      }
      load((index + 1) % tracks.length);
      if (wantPlay) play();
    };
    const onLoaded = () => {
      failed = 0;
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadeddata", onLoaded);

    load(index, resumeAt);

    // Start on the first interaction, unless the visitor muted the music before.
    // Phones and tablets only allow sound from a finished tap (finger lifted: pointerup / touchend / click),
    // not from the finger touching down, so listen for all of them, and keep listening until the music really starts.
    const muted = read(() => localStorage, PREF) === "off";
    const GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;
    const firstGesture = (e: Event) => {
      // The mute button handles its own click.
      if (e.target instanceof Element && e.target.closest(".music")) return;
      if (!audio.paused) {
        removeGesture();
        return;
      }
      wantPlay = true;
      fadeIn();
      audio.play().then(removeGesture, () => {
        // Not a gesture this browser accepts (e.g. a finger touching down); the next one will be.
      });
    };
    const removeGesture = () => {
      for (const type of GESTURES) window.removeEventListener(type, firstGesture, true);
    };
    if (!muted) {
      for (const type of GESTURES) window.addEventListener(type, firstGesture, true);
      play(); // Works straight away if the browser already allows sound for this site.
    }

    api.current = {
      // Start right now, from inside a click (so phones allow the sound), e.g. the "Yes, I'm ready" button.
      start: () => {
        removeGesture();
        write(() => localStorage, PREF, "on");
        if (audio.paused) play();
      },
      toggle: () => {
        removeGesture();
        if (audio.paused) {
          write(() => localStorage, PREF, "on");
          play();
        } else {
          write(() => localStorage, PREF, "off");
          pause();
        }
      },
    };

    // Remember the spot so the other site carries on from here.
    const save = () => write(() => sessionStorage, SPOT, JSON.stringify({ i: index, t: position() }));
    window.addEventListener("pagehide", save);

    return () => {
      save();
      removeGesture();
      window.removeEventListener("pagehide", save);
      cancelAnimationFrame(fade);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      api.current = null;
    };
  }, []);

  const value = missing ? null : { playing, title, toggle: () => api.current?.toggle(), start: () => api.current?.start() };
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

/** The music player, for starting it from a button (null outside the player or if the song can't be loaded). */
export const useMusic = () => useContext(MusicContext);

/** Mute / unmute button for the music. Renders nothing outside the player or if the song can't be loaded. */
export function MusicButton({ className = "" }: { className?: string }) {
  const player = useContext(MusicContext);
  if (!player) return null;
  const { playing, title, toggle } = player;

  return (
    <button
      type="button"
      className={`music ${className}`}
      data-playing={playing}
      aria-label={playing ? "Mute music" : "Play music"}
      title={playing ? `Now playing: ${title}` : "Play music"}
      onClick={toggle}
    >
      <span className="music__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <svg className="music__off" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
        <path d="m16.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    </button>
  );
}
