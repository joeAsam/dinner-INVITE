"""
Builds public/data/map.json from OpenStreetMap Overpass exports (eket.json, ikot.json).

Usage:  python scripts/build-map.py <dir-with-eket.json-and-ikot.json>

Output (all coordinates in metres; x = east, z = south, like three.js with -Z north):
  { eket:  { roads:[{n?, r, p:[x,z,...]}], buildings:[{p:[ring], h}], rivers:[{n?, w, p}], areas:[[ring]] },
    ikot:  { same, in metres around Amalgamation House },
    venues: { key: { x, z, yaw } },          # yaw aligns the model to the nearest street
    ikotOffset: [x, z] }                     # where the Ikot Abasi "island" sits in the scene
Map data © OpenStreetMap contributors (ODbL).
"""
import json, math, random, sys, os

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "map.json")

DE_EXCHANGE = (4.6467952, 7.9429389)
VENUES_EKET = {"deExchange": DE_EXCHANGE, "royalty": (4.645, 7.9358333), "blade": (4.6428571, 7.9168536)}
AMALGAMATION = (4.5698104, 7.5468473)
# Ikot Abasi is ~44 km away. It is placed 8.6 km out on its true bearing so a scroll can reach it.
IKOT_SCENE_DIST = 8600.0

RANK = {"motorway": 3, "trunk": 3, "primary": 3, "primary_link": 2, "secondary": 2, "secondary_link": 2,
        "tertiary": 1, "tertiary_link": 1, "unclassified": 1, "residential": 0, "service": 0, "track": 0,
        "living_street": 0, "road": 0}


def projector(lat0, lon0):
    kx = 111320.0 * math.cos(math.radians(lat0))
    ky = 110574.0
    return lambda lat, lon: (round((lon - lon0) * kx, 1), round(-(lat - lat0) * ky, 1))


def load(path, proj, keep_radius):
    d = json.load(open(path, encoding="utf8"))
    roads, buildings, rivers, areas = [], [], [], []
    inside = lambda p: math.hypot(p[0], p[1]) <= keep_radius
    for e in d["elements"]:
        t = e.get("tags", {})
        if e["type"] == "way" and "geometry" in e:
            pts = [proj(g["lat"], g["lon"]) for g in e["geometry"]]
            if "highway" in t and t["highway"] in RANK:
                run = []
                for q in pts:
                    if inside(q):
                        run.append(q)
                    else:
                        if len(run) > 1:
                            roads.append({"n": t.get("name") or t.get("ref"), "r": RANK[t["highway"]], "p": [c for q2 in run for c in q2]})
                        run = []
                if len(run) > 1:
                    roads.append({"n": t.get("name") or t.get("ref"), "r": RANK[t["highway"]], "p": [c for q2 in run for c in q2]})
            elif "building" in t and len(pts) >= 4 and inside(pts[0]):
                lv = t.get("building:levels")
                try:
                    h = float(lv) * 3.3 if lv else None
                except ValueError:
                    h = None
                buildings.append({"p": [c for q in pts for c in q], "h": h, "osm": 1})
            elif "waterway" in t and t["waterway"] in ("river", "stream", "canal"):
                w = 90.0 if t["waterway"] == "river" else 10.0
                rivers.append({"n": t.get("name"), "w": w, "p": [c for q in pts for c in q]})
            elif t.get("natural") == "water" and len(pts) >= 4:
                areas.append([c for q in pts for c in q])
        elif e["type"] == "relation" and t.get("natural") == "water":
            for m in e.get("members", []):
                if m.get("role") == "outer" and "geometry" in m and len(m["geometry"]) >= 4:
                    areas.append([c for g in m["geometry"] for c in proj(g["lat"], g["lon"])])
    return roads, buildings, rivers, areas


def seg_dist(px, pz, ax, az, bx, bz):
    vx, vz = bx - ax, bz - az
    L = vx * vx + vz * vz or 1e-9
    t = max(0.0, min(1.0, ((px - ax) * vx + (pz - az) * vz) / L))
    return math.hypot(px - (ax + vx * t), pz - (az + vz * t)), (vx, vz)


def nearest_road_yaw(roads, x, z):
    """Yaw that turns a model's +Z (its front) towards the closest point on any road."""
    best = (1e18, (0.0, 1.0))
    for r in roads:
        p = r["p"]
        for i in range(0, len(p) - 2, 2):
            ax, az, bx, bz = p[i], p[i + 1], p[i + 2], p[i + 3]
            vx, vz = bx - ax, bz - az
            L = vx * vx + vz * vz or 1e-9
            t = max(0.0, min(1.0, ((x - ax) * vx + (z - az) * vz) / L))
            qx, qz = ax + vx * t, az + vz * t
            d = math.hypot(x - qx, z - qz)
            if d < best[0]:
                best = (d, (qx - x, qz - z))
    dx, dz = best[1]
    return round(math.atan2(dx, dz), 4), round(best[0], 1)


class Grid:
    """Coarse occupancy grid (4 m cells) so filler buildings never sit on roads or each other."""

    def __init__(self, cell=4.0):
        self.c = cell
        self.s = set()

    def key(self, x, z):
        return (int(math.floor(x / self.c)), int(math.floor(z / self.c)))

    def mark_rect(self, cx, cz, w, d, yaw, pad=0.0):
        for (x, z) in rect_samples(cx, cz, w + pad, d + pad, yaw, self.c * 0.7):
            self.s.add(self.key(x, z))

    def free_rect(self, cx, cz, w, d, yaw):
        return all(self.key(x, z) not in self.s for (x, z) in rect_samples(cx, cz, w, d, yaw, self.c * 0.7))

    def mark_line(self, p, half):
        for i in range(0, len(p) - 2, 2):
            ax, az, bx, bz = p[i], p[i + 1], p[i + 2], p[i + 3]
            L = math.hypot(bx - ax, bz - az)
            n = max(1, int(L / (self.c * 0.6)))
            nx, nz = (-(bz - az) / (L or 1), (bx - ax) / (L or 1))
            for k in range(n + 1):
                t = k / n
                x, z = ax + (bx - ax) * t, az + (bz - az) * t
                o = -half
                while o <= half:
                    self.s.add(self.key(x + nx * o, z + nz * o))
                    o += self.c * 0.6


def rect_samples(cx, cz, w, d, yaw, step):
    c, s = math.cos(yaw), math.sin(yaw)
    out = []
    u = -w / 2
    while u <= w / 2 + 1e-6:
        v = -d / 2
        while v <= d / 2 + 1e-6:
            out.append((cx + u * c + v * s, cz - u * s + v * c))
            v += step
        u += step
    return out


def rect_ring(cx, cz, w, d, yaw):
    c, s = math.cos(yaw), math.sin(yaw)
    pts = []
    for (u, v) in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2), (-w / 2, -d / 2)):
        pts += [round(cx + u * c + v * s, 1), round(cz - u * s + v * c, 1)]
    return pts


WIDTH = [5, 8, 12, 17]


def fill_buildings(roads, buildings, clear_spots, rng, cap):
    """Lines rank 0–1 streets with plots of houses, shops and the odd taller block."""
    g = Grid()
    for r in roads:
        g.mark_line(r["p"], WIDTH[r["r"]] / 2 + 2.5)
    for b in buildings:
        p = b["p"]
        xs, zs = p[0::2], p[1::2]
        for x, z in zip(xs, zs):
            g.s.add(g.key(x, z))
        g.mark_rect(sum(xs) / len(xs), sum(zs) / len(zs), max(xs) - min(xs), max(zs) - min(zs), 0)
    added = []
    for r in roads:
        if r["r"] > 2:
            continue
        p = r["p"]
        for i in range(0, len(p) - 2, 2):
            ax, az, bx, bz = p[i], p[i + 1], p[i + 2], p[i + 3]
            L = math.hypot(bx - ax, bz - az)
            if L < 8:
                continue
            tx, tz = (bx - ax) / L, (bz - az) / L
            yaw = math.atan2(tx, tz)
            s = rng.uniform(2, 8)
            while s < L - 4 and len(added) < cap:
                w = rng.uniform(8, 16)
                d = rng.uniform(9, 18)
                for side in (-1, 1):
                    off = WIDTH[r["r"]] / 2 + 3 + d / 2 + rng.uniform(0, 4)
                    cx = ax + tx * s - tz * off * side
                    cz = az + tz * s + tx * off * side
                    if any(math.hypot(cx - sx, cz - sz) < rad for (sx, sz, rad) in clear_spots):
                        continue
                    if rng.random() < 0.18 or not g.free_rect(cx, cz, w + 2, d + 2, yaw):
                        continue
                    g.mark_rect(cx, cz, w, d, yaw, 2.0)
                    tall = rng.random()
                    h = 3.6 if tall < 0.55 else 7.0 if tall < 0.88 else 10.5 if tall < 0.97 else 14.0
                    added.append({"p": rect_ring(cx, cz, w, d, yaw), "h": h})
                s += w + rng.uniform(3, 9)
    return added


def main():
    eket_proj = projector(*DE_EXCHANGE)
    roads, buildings, rivers, areas = load(os.path.join(SRC, "eket.json"), eket_proj, 3900)
    venues = {}
    for k, (lat, lon) in VENUES_EKET.items():
        x, z = eket_proj(lat, lon)
        yaw, dist = nearest_road_yaw([r for r in roads if r["r"] >= 0], x, z)
        venues[k] = {"x": x, "z": z, "yaw": yaw, "roadDist": dist}
    clear = [(v["x"], v["z"], 75.0) for v in venues.values()]
    buildings = [b for b in buildings if not any(math.hypot(b["p"][0] - cx, b["p"][1] - cz) < r for cx, cz, r in clear)]
    rng = random.Random(26)
    buildings += fill_buildings(roads, buildings, clear, rng, 9000)

    ix, iz = eket_proj(*AMALGAMATION)
    L = math.hypot(ix, iz)
    off = [round(ix / L * IKOT_SCENE_DIST, 1), round(iz / L * IKOT_SCENE_DIST, 1)]
    ikot_proj = projector(*AMALGAMATION)
    iroads, ibuild, irivers, iareas = load(os.path.join(SRC, "ikot.json"), ikot_proj, 1900)
    iyaw, idist = nearest_road_yaw(iroads, 0, 0)
    ibuild = [b for b in ibuild if math.hypot(b["p"][0], b["p"][1]) > 70]
    ibuild = [{**b, "h": b["h"] or (3.6 if rng.random() < 0.7 else 7.0)} for b in ibuild]
    for b in buildings:
        if not b.get("h"):
            b["h"] = 3.6 if rng.random() < 0.6 else 7.0
    for b in buildings + ibuild:
        b.pop("osm", None)
    venues["amalgamation"] = {"x": 0.0, "z": 0.0, "yaw": iyaw, "roadDist": idist}

    data = {
        "attribution": "Map data © OpenStreetMap contributors (ODbL)",
        "eket": {"roads": roads, "buildings": buildings, "rivers": rivers, "areas": areas},
        "ikot": {"roads": iroads, "buildings": ibuild, "rivers": irivers, "areas": iareas},
        "venues": venues,
        "ikotOffset": off,
        "ikotTrueDistanceKm": round(L / 1000, 1),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w"), separators=(",", ":"))
    print("roads", len(roads), "buildings", len(buildings), "rivers", len(rivers), "areas", len(areas))
    print("ikot roads", len(iroads), "buildings", len(ibuild), "rivers", len(irivers), "areas", len(iareas))
    print("venues", venues, "ikotOffset", off, "true km", round(L / 1000, 1))
    print("bytes", os.path.getsize(OUT))


main()
