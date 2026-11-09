import { toScene, VENUES, type VenueKey } from "./venues";

type V3 = [number, number, number];

export type PlaceId = "overview" | "day1" | "day2" | "day3" | "day4" | "day5";

export type Destination = {
  id: PlaceId;
  place: string;
  short?: string;
  venue?: VenueKey;
  /** 0-based day index (beacon / colour), -1 for the overview. */
  day: number;
  anchor: V3;
  pos: V3;
  look: V3;
  mobile?: { pos: V3; look: V3 };
  /** Local time (minutes after midnight) the scene lights itself for at this stop. */
  minutes: number;
  /** Open the hotspot label to the left (keeps neighbouring venues readable on the overview). */
  labelLeft?: boolean;
};

const L = toScene;

/** The tour: overview of Eket, then one stop per day. Day 1 and Day 5 share DE Exchange (hall front by morning, garden by night). */
export const destinations: Destination[] = [
  { id: "overview", place: "Eket", day: -1, anchor: [-1450, 0, 220], pos: [-1300, 1350, 3700], look: [-1300, 0, 120], mobile: { pos: [-1480, 2300, 4300], look: [-1450, 0, 120] }, minutes: 18 * 60 + 52 },
  { id: "day1", place: "Leadership Session", short: "Day 1", venue: "deExchange", day: 0, anchor: L("deExchange", [0, 16, 14]), pos: L("deExchange", [58, 30, 92]), look: L("deExchange", [-2, 9, 2]), mobile: { pos: L("deExchange", [34, 42, 128]), look: L("deExchange", [0, 8, 0]) }, minutes: 10 * 60 + 15 },
  { id: "day2", place: "Movie Night", short: "Day 2", venue: "royalty", day: 1, labelLeft: true, anchor: L("royalty", [0, 14, -44]), pos: L("royalty", [17, 13, -15]), look: L("royalty", [0, 5, -62]), mobile: { pos: L("royalty", [6, 18, -8]), look: L("royalty", [0, 5, -60]) }, minutes: 20 * 60 + 40 },
  { id: "day3", place: "Excursion", short: "Day 3", venue: "amalgamation", day: 2, anchor: L("amalgamation", [0, 16, 0]), pos: L("amalgamation", [64, 32, 74]), look: L("amalgamation", [0, 6, -2]), mobile: { pos: L("amalgamation", [40, 48, 112]), look: L("amalgamation", [0, 6, 0]) }, minutes: 11 * 60 },
  { id: "day4", place: "Games Night", short: "Day 4", venue: "blade", day: 3, anchor: L("blade", [0, 12, 8]), pos: L("blade", [44, 22, 58]), look: L("blade", [0, 3, 4]), mobile: { pos: L("blade", [24, 34, 86]), look: L("blade", [0, 3, 2]) }, minutes: 21 * 60 },
  { id: "day5", place: "Dinner & Awards Night", short: "Day 5", venue: "deExchange", day: 4, anchor: L("deExchange", [0, 190, -58]), pos: L("deExchange", [36, 20, -14]), look: L("deExchange", [0, 3, -62]), mobile: { pos: L("deExchange", [18, 30, 8]), look: L("deExchange", [0, 3, -60]) }, minutes: 20 * 60 },
];

export const byId = Object.fromEntries(destinations.map((d) => [d.id, d])) as Record<PlaceId, Destination>;
export const tourOrder: PlaceId[] = ["overview", "day1", "day2", "day3", "day4", "day5"];
export const isPlace = (v: unknown): v is PlaceId => typeof v === "string" && v in byId;

/** Direction the ember arrives from: in off the Atlantic, from the south-east. */
export const ARRIVAL_ANGLE = (58 * Math.PI) / 180;

/** Per-day accent colours (beacons, hotspot dots, panel accents). */
export const DAY_COLORS = ["#ffb347", "#7aa7ff", "#5fd3a5", "#ff6fb1", "#ffd36b"];

export { VENUES };
