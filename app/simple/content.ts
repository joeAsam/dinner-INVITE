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

import { event } from "@/lib/content";

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
       Each opens the 3D experience at that day. */
    links: [
      ...event.days.map((d) => ({ label: `Day ${d.day}`, href: `/?at=day${d.day}` })),
      { label: "3D Experience", href: "/" },
    ],
    /* Opens the RSVP stop at the end of the 3D experience. */
    button: { label: "RSVP", href: "/?at=rsvp" },
    openMenuLabel: "Open navigation menu",
    closeMenuLabel: "Close navigation menu",
  },

  /* ---------- Hero (the first screen) ---------- */
  hero: {
    /* The headline is three lines: titleStart, one of rotatingWords, titleEnd. */
    titleStart: "Ship your",
    rotatingWords: ["websites", "backend", "frontend", "projects"],
    titleEnd: "live, globally.",
    lead: "Pxxl builds and runs your apps, databases and domains from your repo, close to your users.",
    primaryButton: { label: "Get started", href: "#features" },
    secondaryButton: { label: "Get a domain", href: "#datacenters" },
    /* The word after the city name on the map tag, e.g. "Lagos, NG - Datacenter". */
    mapTagLabel: "Datacenter",
    logosLabel: "Trusted by teams at",
    /* style is the lettering used for the name: "serif", "heavy", "bold" or "wide". */
    logos: [
      { name: "dayroom", style: "serif" },
      { name: "OUNJEFOOD", style: "heavy" },
      { name: "FlagSwift", style: "bold" },
      { name: "CENCORI", style: "wide" },
    ],
  },

  /* ---------- Big sentence with counting numbers ---------- */
  stats: {
    /* Each {name} is replaced by the matching number below, shown in a pink chip. */
    sentence:
      "{developers} developers have built {projects} projects, shipped {deployments} deployments and served {requests} requests to {people} people in {countries} countries through Pxxl.",
    numbers: {
      developers: 8329,
      projects: 9361,
      deployments: 103413,
      requests: 156843415,
      people: 3091628,
      countries: 223,
    },
  },

  /* ---------- Features (tabs on the left, product window on the right) ---------- */
  features: {
    heading: "From repo to production, in one place.",
    items: [
      {
        id: "deploy", // used in the page address (#deploy): lowercase, no spaces, unique
        title: "Deploy From Your Repo",
        desc: "Push to Git and get a live URL, no config needed",
        step: "Step 1 of 4",
        stepTitle: "Deployment source",
        hint: "Pick the path that matches how your project is stored.",
        options: [
          { name: "GitHub", desc: "Import a repository and deploy future commits." },
          { name: "GitLab", desc: "Connect GitLab and deploy from your projects." },
          { name: "Pxxl Drop", desc: "Drag a local archive or static build from your device." },
          { name: "WordPress", desc: "Launch a managed WordPress installation." },
          { name: "Docker image", desc: "Run a prebuilt image from Docker Hub or a registry." },
          { name: "Dockerfile", desc: "Build with your own container instructions." },
        ],
      },
      {
        id: "databases",
        title: "Spin Up Databases",
        desc: "MongoDB, PostgreSQL and MySQL in seconds",
        step: "Step 1 of 2",
        stepTitle: "Database Type",
        hint: "Choose the database engine for this instance.",
        options: [
          { name: "PostgreSQL", desc: "Relational SQL database with advanced data types." },
          { name: "MySQL", desc: "Reliable relational database for web applications." },
          { name: "MongoDB", desc: "Document database for flexible application data." },
          { name: "Redis", desc: "In-memory data store for caching and queues." },
          { name: "MariaDB", desc: "Open-source MySQL-compatible relational database." },
          { name: "ClickHouse", desc: "Columnar database for high-speed analytics." },
        ],
      },
      {
        id: "ai-tools",
        title: "Connect Your AI Tools",
        desc: "MCP for Claude, Cursor and Codex, plus an API",
        step: "Step 1 of 3",
        stepTitle: "MCP Client",
        hint: "Choose where this connection will be used.",
        options: [
          { name: "Claude Desktop", desc: "Connect Anthropic's desktop client." },
          { name: "Cursor", desc: "Use Pxxl tools inside Cursor." },
          { name: "Codex", desc: "Connect an OpenAI Codex client." },
          { name: "Other client", desc: "Configure any remote MCP client." },
        ],
      },
    ],
  },

  /* ---------- Agent (chat window with build logs) ---------- */
  agent: {
    heading: "There's an agent for this.",
    headingDim: "Ask it to debug a build.", // the greyed second half of the heading
    button: { label: "Try the agent", href: "#faq" },
    /* One-sentence description of the picture, for screen readers. */
    description: "The simple view: no WebGL, one scrolling page.",
    userMessage: "Why did my last deployment fail?",
    /* Wrap a word in `backticks` to show it as code. */
    reply: "The build stopped on a type error. `users.ts` imports a name that was renamed in the last commit.",
    tableHeaders: ["Field", "Value"],
    tableRows: [
      ["Project", "investor-api"],
      ["Status", "Failed"],
      ["Commit", "a41c9e2 · Rename user types"],
      ["Build time", "1m 7s"],
    ],
    followUp: "I can fix the import and redeploy.",
    logsTitle: "Build logs",
    logsSummary: "8 lines · 4 with errors",
    /* error: true shows the line in red. */
    logLines: [
      { text: "#5 [4/6] RUN npm ci", error: false },
      { text: "added 412 packages in 18s", error: false },
      { text: "#7 [6/6] RUN npm run build", error: false },
      { text: "> tsc -p .", error: false },
      { text: "src/routes/users.ts(42,17): error TS2304: Cannot find name 'UserRecord'.", error: true },
      { text: "src/routes/users.ts(58,9): error TS2304: Cannot find name 'UserRecord'.", error: true },
      { text: "npm ERR! code ELIFECYCLE", error: true },
      { text: "Build failed with exit code 2", error: true },
    ],
  },

  /* ---------- Datacenters (the strips that open as you scroll) ---------- */
  datacenters: {
    heading: "Our Datacenter Locations",
    /* The site has five background scenes; a sixth location reuses the first one. */
    locations: [
      {
        region: "West Africa",
        city: "Lagos, Nigeria",
        desc: "Our home. Apps for Lagos, Abuja, Accra and the rest of West Africa run a short hop from the people using them.",
      },
      {
        region: "EU-Central",
        city: "Nuremberg, Germany",
        desc: "The default for new projects, with strong links across Europe, Africa and the Middle East.",
      },
      {
        region: "EU-West",
        city: "Paris, France",
        desc: "A short trip for users in France, the UK, Spain and North Africa.",
      },
      {
        region: "EU-North",
        city: "Helsinki and Copenhagen",
        desc: "Covers the Nordics and the Baltics from two cities at once.",
      },
      {
        region: "US-East",
        city: "New York, United States",
        desc: "Close to users across North America, and a quick hop to South America and Western Europe.",
      },
    ],
  },

  /* ---------- Questions and answers ---------- */
  faq: {
    heading: "Frequently asked questions", // read by screen readers, not shown
    items: [
      {
        q: "What is Pxxl and how does it work?",
        a: "Pxxl is a powerful cloud deployment platform that allows developers to deploy web applications instantly with zero configuration. Simply connect your Git repository, and Pxxl automatically configures your project environment, builds your application, and deploys it globally across our high-performance CDN network.",
      },
      {
        q: "Which languages and frameworks are supported?",
        a: "Pxxl supports over 20 programming languages and frameworks including React, Next.js, Vue.js, Angular, Node.js, Python, PHP, HTML/CSS, and many more. Our platform automatically detects your project type and configures the optimal environment.",
      },
      {
        q: "Does Pxxl provide database services?",
        a: "Yes! Pxxl offers comprehensive database management for MongoDB, PostgreSQL, and MySQL. You can create and manage databases in seconds with seamless integration into your application workflow, all through our intuitive dashboard.",
      },
      {
        q: "Can I collaborate with my team?",
        a: "Absolutely! Pxxl supports team collaboration features where you can create teams, share projects and databases across team members, and manage permissions. This enables efficient collaboration and streamlined development workflows.",
      },
    ],
  },

  /* ---------- Footer ---------- */
  footer: {
    tagline: "Develop with your favorite tools. Launch globally, instantly.",
    copyright: "© Pxxl App  •  MMXXIV — MMXXVI",
    /* Icons exist for "Facebook", "Instagram", "TikTok" and "X". */
    socialLabelPrefix: "Pxxl on", // read aloud as "Pxxl on Facebook"
    socials: [
      { name: "Facebook", href: "#top" },
      { name: "Instagram", href: "#top" },
      { name: "TikTok", href: "#top" },
      { name: "X", href: "#top" },
    ],
    columns: [
      {
        title: "Links",
        links: [
          { label: "Domains", href: "#top" },
          { label: "Guides", href: "#top" },
          { label: "Changelog", href: "#top" },
          { label: "Status Page", href: "#top" },
          { label: "DNS Lookup", href: "#top" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "About Us", href: "#top" },
          { label: "Contact Us", href: "#top" },
          { label: "Donate", href: "#top" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms & Conditions", href: "#top" },
          { label: "Privacy Policy", href: "#top" },
        ],
      },
    ],
    bigWord: "youth.week", // the huge word at the very bottom
  },
};
