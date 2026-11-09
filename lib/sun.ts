/** NOAA-style solar position (degrees). Same model the original uses to light the city. */
const RAD = Math.PI / 180;

export const SITE = { lat: 4.6468, lon: 7.9429, utcOffsetMin: 60 }; // Eket, WAT (UTC+1)

export function sunPosition(date: Date, lat = SITE.lat, lon = SITE.lon) {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - yearStart) / 864e5) + 1;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const leap = new Date(Date.UTC(date.getUTCFullYear(), 1, 29)).getUTCMonth() === 1;
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (day - 1 + (hours - 12) / 24);
  const eqTime = 229.18 * (75e-6 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 907e-6 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = ((hours * 60 + eqTime + 4 * lon) / 4 - 180) * RAD;
  const phi = lat * RAD;
  const zen = Math.acos(Math.min(1, Math.max(-1, Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha))));
  let az = Math.acos(Math.min(1, Math.max(-1, (Math.sin(phi) * Math.cos(zen) - Math.sin(decl)) / (Math.cos(phi) * Math.sin(zen))))) / RAD;
  az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  return { azimuth: az, elevation: 90 - zen / RAD };
}

/** A local wall-clock time on a date (YYYY-MM-DD, minutes after midnight) as a Date. */
export function localTime(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0) + (minutes - SITE.utcOffsetMin) * 6e4);
}

export function localNow(now = new Date()) {
  const t = new Date(now.getTime() + SITE.utcOffsetMin * 6e4);
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() + t.getUTCSeconds() / 60 };
}

/** Minutes after midnight when the sun crosses −0.833° (bisection between 15:00 and 21:00). */
export function sunsetMinutes(date: string) {
  let lo = 900;
  let hi = 1260;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (sunPosition(localTime(date, mid)).elevation > -0.833) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
