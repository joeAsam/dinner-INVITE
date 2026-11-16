/*
 * ALL THE WORDS ON THE SITE LIVE IN THIS ONE FILE.
 *
 * How to edit:
 *   - Change only the text between the "quotes". Keep the quotes, commas and brackets.
 *   - Save the file. The site updates on its own while `npm run dev` is running.
 *   - To add an item to a list (a nav link, a plan, a question), copy one whole
 *     { ... }, block including its trailing comma, paste it below, and edit it.
 *   - To remove an item, delete its whole { ... }, block.
 *   - If your text contains a double quote, write it as \" (for example "the \"best\" host").
 *   - `href` is where a link goes: "#features" jumps to a section of this page,
 *     "/" is the site's home page, "https://..." is another website.
 *
 * The sections below are in the same order as the page, top to bottom.
 */

import { dayLong, event, time12 } from "@/lib/content";
import { VENUES } from "@/lib/venues";

const first = event.days[0];
const last = event.days[event.days.length - 1];

export const content = {
  /* Browser tab title and the description search engines show. */
  site: {
    title: "Youth Choir Week 2026 · Simple view",
    description: "The simple view: no WebGL, one scrolling page.",
  },

  /* Logo text beside the flame (the year shows in amber), and labels read aloud by screen readers. */
  brand: {
    logoName: event.name,
    logoYear: String(event.year),
    logoLabel: `${event.name} ${event.year}, back to top`,
    skipLink: "Skip to content",
  },

  /* ---------- Top navigation ---------- */
  nav: {
    /* One link per day of the week (Day 1 ... Day n), made from the days in lib/content.ts.
       Each jumps to that day's card further down this page. */
    links: [
      ...event.days.map((d) => ({ label: `Day ${d.day}`, href: `#day${d.day}` })),
      { label: "3D Experience", href: "/" },
    ],
    /* Opens the RSVP page, where guests get their ticket. */
    button: { label: "RSVP", href: event.rsvpUrl },
    openMenuLabel: "Open navigation menu",
    closeMenuLabel: "Close navigation menu",
  },

  /* ---------- Hero (the first screen) ---------- */
  hero: {
    /* The headline is three lines: titleStart, one of rotatingWords, titleEnd. */
    titleStart: "Beyond the",
    rotatingWords: ["music", "outings", "conversations"],
    titleEnd: "Into the memories.",
    lead: "Five days of friendship, fun and unforgettable memories. From the conference to the grand finale, we're bringing the family together for an experience beyond the music.",
    primaryButton: { label: "RSVP", href: event.rsvpUrl },
    secondaryButton: { label: "See Events", href: "#features" },
    logosLabel: "THE WEEK WE'VE BEEN WAITING FOR.",
    /* style is the lettering used for the name: "serif", "heavy", "bold" or "wide". */
    logos: [
      { name: "fun", style: "serif" },
      { name: "ADVENTURE", style: "heavy" },
      { name: "Bonding", style: "bold" },
      { name: "CELEBRATION", style: "wide" },
    ],
  },

  /* ---------- Big sentence with counting numbers ---------- */
  stats: {
    /* Each {name} is replaced by the matching number below, shown in a chip that counts up. */
    sentence:
      "Over {voices} voices have been part of our journey. Nearly {students} students have pursued their academic dreams, {freshers} this year have taken their first steps into tertiary education, and {careers}+ members have built careers across leading industries around the world. This is the Field Temple Youth Choir story.",
    numbers: {
      voices: 200,
      students: 50,
      freshers: 10,
      careers: 10,
    },
  },

  /* ---------- The five days (tabs on the left, one card per day on the right) ----------
     Each day's title, date, times, venue, dress code and "what to expect" come from
     lib/content.ts, the same list the 3D experience uses, so edit the days there.
     The words below are the labels around them. */
  features: {
    heading: "Five days, four venues.",
    whenLabel: "When",
    whereLabel: "Where",
    dressLabel: "Dress code",
    expectLabel: "What to expect",
    mapLabel: "Directions",
    button: { label: "Get your ticket", href: event.rsvpUrl },
  },

  /* ---------- Pictures (the strips that open as you scroll) ----------
     Photos live in public/simple/gallery/. To swap one, replace the file (keep the name)
     or point `src` at a new file in that folder. `alt` describes the photo for screen readers. */
  gallery: {
    heading: "Moments from our journey",
    photos: [
      {
        src: "/simple/gallery/full-choir.jpg",
        alt: "The Field Temple Youth Choir in white shirts, red ties and navy, on the church steps",
        tag: "The choir",
        title: "One choir",
        desc: "The Field Temple Youth Choir in our uniforms, together.",
      },
      {
        src: "/simple/gallery/session.jpg",
        alt: "Choir members seated around a table, listening during a session",
        tag: "Sessions",
        title: "Learning together",
        desc: "Leadership sessions where we sharpen how we lead, serve our sections and grow.",
      },
      {
        src: "/simple/gallery/workshop.jpg",
        alt: "Choir members building a model from sticks and paper at a table",
        tag: "Workshops",
        title: "Hands on",
        desc: "Team challenges that turn a room of voices into one working team.",
      },
      {
        src: "/simple/gallery/awards.jpg",
        alt: "A choir executive receiving a Most Active Executive of the Year certificate",
        tag: "Awards",
        title: "Celebrating our own",
        desc: "Awards presentation, where we honour the people who carry the choir all year.",
      },
      {
        src: "/simple/gallery/together.jpg",
        alt: "Smiling choir members in uniform posing in front of the church building",
        tag: "Family",
        title: "More than a choir",
        desc: "Friendships, mentors and a family that keeps singing long after the last note.",
      },
    ],
  },

  /* ---------- Questions and answers ---------- */
  faq: {
    heading: "Frequently asked questions", // read by screen readers, not shown
    /* Choir week questions first, then general ones about the choir. */
    items: [
      {
        q: "When does the week commence?",
        a: `Youth Choir Week starts on ${dayLong(first.date)} at ${time12(first.start)} with the ${first.title} at ${VENUES[first.venue].name}, and runs until the ${last.title} on ${dayLong(last.date)}. The days above have the times and venues for each day.`,
      },
      {
        q: "Is the Dinner and Awards Night open to guests?",
        // ⚠ Placeholder answer: confirm with the organisers before going live.
        a: "Yes. Family and friends are welcome to join us for the Dinner and Awards Night. Each guest should RSVP with their own name and email so we can plan seats and food, and the dress code is formal.",
      },
      {
        q: "How do I register or confirm my participation?",
        a: "Tap RSVP and enter your name and email. You'll get a personal ticket with a QR code by email. One ticket covers all five days. Show it at the door each day, and we'll email you a reminder 2 hours before each day starts.",
      },
      {
        q: "Who can be part of the choir?",
        // ⚠ Placeholder answer: confirm with the choir leadership before going live.
        a: "Any young person in Field Temple who loves to sing and serve is welcome. Speak to any choir executive after service, or come along to a rehearsal to get started.",
      },
    ],
  },

  /* ---------- Footer ---------- */
  footer: {
    tagline: `${event.theme}.`,
    copyright: "© TAC Field Temple Youth Choir  •  MMXXVI",
    /* Icons exist for "Facebook", "Instagram", "TikTok" and "X". Add a line to list another. */
    socialLabelPrefix: "Field Temple Youth Choir on", // read aloud as "Field Temple Youth Choir on Facebook"
    socials: [{ name: "Facebook", href: "https://web.facebook.com/profile.php?id=61550265632037" }],
    bigWord: "youth.week", // the huge word at the very bottom
  },
};
