import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";

const SEPTA_VEHICLE_PRINT =
  "https://www3.septa.org/gtfsrt/septa-pa-us/Vehicle/print.php";
const SEPTA_TRIP_PRINT =
  "https://www3.septa.org/gtfsrt/septa-pa-us/Trip/print.php";
const SEPTA_RAIL_TRIP_PRINT =
  "https://www3.septa.org/gtfsrt/septarail-pa-us/Trip/print.php";
const SEPTA_SERVICE_ALERT_PRINT =
  "https://www3.septa.org/gtfsrt/septa-pa-us/Service/print.php";

const ROUTES = {
  L: {
    id: "L",
    aliases: ["MFL"],
    legacyIds: ["MFL"],
    name: "Market-Frankford Line",
    badge: "L",
    color: "#0072CE",
    terminals: ["69th Street TC", "Frankford TC"]
  },
  B1: {
    id: "B1",
    aliases: ["B", "BSL"],
    legacyIds: ["BSL"],
    name: "Broad Street Local",
    badge: "B",
    color: "#F58220",
    terminals: ["NRG Station", "Fern Rock TC"]
  },
  B2: {
    id: "B2",
    aliases: ["BSL"],
    legacyIds: [],
    name: "Broad Street Express",
    badge: "BX",
    color: "#FF8A00",
    terminals: ["Walnut-Locust", "Fern Rock TC"]
  },
  B3: {
    id: "B3",
    aliases: ["BSL"],
    legacyIds: [],
    name: "Broad-Ridge Spur",
    badge: "BS",
    color: "#B46A28",
    terminals: ["8th-Market", "Fern Rock TC"]
  },
  M: {
    id: "M",
    aliases: ["NHSL", "100"],
    legacyIds: ["NHSL", "100"],
    name: "Norristown High Speed Line",
    badge: "M",
    color: "#6F2DA8",
    terminals: ["69th Street TC", "Norristown TC"]
  }
};

const STOPS = {
  L: [
    ["69th Street TC", 39.96183, -75.25818],
    ["Millbourne", 39.96392, -75.24927],
    ["63rd Street", 39.96358, -75.24556],
    ["60th Street", 39.96108, -75.23972],
    ["56th Street", 39.96052, -75.23215],
    ["52nd Street", 39.95888, -75.22462],
    ["46th Street", 39.95741, -75.21362],
    ["40th Street", 39.9565, -75.20329],
    ["34th Street", 39.95562, -75.19175],
    ["30th Street", 39.95547, -75.18325],
    ["15th Street", 39.95247, -75.16509],
    ["13th Street", 39.95194, -75.16104],
    ["11th Street", 39.95166, -75.15817],
    ["8th Street", 39.95115, -75.15358],
    ["5th Street", 39.95091, -75.14874],
    ["2nd Street", 39.95056, -75.14452],
    ["Spring Garden", 39.96141, -75.14033],
    ["Girard", 39.97073, -75.13468],
    ["Berks", 39.97823, -75.13234],
    ["York-Dauphin", 39.98587, -75.13172],
    ["Huntingdon", 39.99158, -75.12751],
    ["Somerset", 39.99649, -75.12165],
    ["Allegheny", 40.00182, -75.11472],
    ["Tioga", 40.00484, -75.10595],
    ["Erie-Torresdale", 40.00688, -75.09658],
    ["Church", 40.00777, -75.08853],
    ["Arrott TC", 40.01604, -75.08495],
    ["Frankford TC", 40.02387, -75.07675]
  ],
  B1: [
    ["NRG Station", 39.90616, -75.17305],
    ["Oregon", 39.91685, -75.17132],
    ["Snyder", 39.92315, -75.16988],
    ["Tasker-Morris", 39.92974, -75.16844],
    ["Ellsworth-Federal", 39.93592, -75.16703],
    ["Lombard-South", 39.94456, -75.16498],
    ["Walnut-Locust", 39.94902, -75.16401],
    ["City Hall", 39.95242, -75.16361],
    ["Race-Vine", 39.95661, -75.16263],
    ["Spring Garden", 39.96275, -75.16134],
    ["Fairmount", 39.96715, -75.16033],
    ["Girard", 39.97195, -75.15931],
    ["Cecil B. Moore", 39.97807, -75.15792],
    ["Susquehanna-Dauphin", 39.98637, -75.15621],
    ["North Philadelphia", 39.99297, -75.15472],
    ["Allegheny", 40.00263, -75.15244],
    ["Erie", 40.00906, -75.15106],
    ["Hunting Park", 40.01628, -75.14942],
    ["Wyoming", 40.02416, -75.14766],
    ["Logan", 40.03063, -75.1462],
    ["Olney TC", 40.03682, -75.14482],
    ["Fern Rock TC", 40.04062, -75.13781]
  ],
  B2: [
    ["Walnut-Locust", 39.94902, -75.16401],
    ["City Hall", 39.95242, -75.16361],
    ["Girard", 39.97195, -75.15931],
    ["Cecil B. Moore", 39.97807, -75.15792],
    ["Erie", 40.00906, -75.15106],
    ["Olney TC", 40.03682, -75.14482],
    ["Fern Rock TC", 40.04062, -75.13781]
  ],
  B3: [
    ["8th-Market", 39.95115, -75.15358],
    ["Chinatown", 39.95593, -75.15375],
    ["Spring Garden", 39.96275, -75.16134],
    ["Fairmount", 39.96715, -75.16033],
    ["Girard", 39.97195, -75.15931],
    ["Cecil B. Moore", 39.97807, -75.15792],
    ["Erie", 40.00906, -75.15106],
    ["Olney TC", 40.03682, -75.14482],
    ["Fern Rock TC", 40.04062, -75.13781]
  ],
  M: [
    ["69th Street TC", 39.96183, -75.25818],
    ["Parkview", 39.96763, -75.26047],
    ["Township Line Rd", 39.97651, -75.27662],
    ["Penfield", 39.97986, -75.28446],
    ["Beechwood-Brookline", 39.98492, -75.298],
    ["Wynnewood Road", 39.99035, -75.30975],
    ["Ardmore Junction", 40.00017, -75.31645],
    ["Haverford", 40.00905, -75.31861],
    ["Bryn Mawr", 40.02195, -75.32375],
    ["Roberts Road", 40.02967, -75.33732],
    ["Gulph Mills", 40.06915, -75.34665],
    ["Norristown TC", 40.11342, -75.34424]
  ]
};

Object.assign(ROUTES, {
  T1: { id: "T1", aliases: ["10"], legacyIds: ["10"], name: "T1 Trolley", badge: "T1", color: "#4CAF50", terminals: ["13th Street", "63rd-Malvern"] },
  T2: { id: "T2", aliases: ["34"], legacyIds: ["34"], name: "T2 Trolley", badge: "T2", color: "#3FA34D", terminals: ["13th Street", "61st-Baltimore"] },
  T3: { id: "T3", aliases: ["13"], legacyIds: ["13"], name: "T3 Trolley", badge: "T3", color: "#2F8F46", terminals: ["13th Street", "Yeadon/Darby"] },
  T4: { id: "T4", aliases: ["11"], legacyIds: ["11"], name: "T4 Trolley", badge: "T4", color: "#287C3B", terminals: ["13th Street", "Darby TC"] },
  T5: { id: "T5", aliases: ["36"], legacyIds: ["36"], name: "T5 Trolley", badge: "T5", color: "#1F6B32", terminals: ["13th Street", "Eastwick"] },
  G: { id: "G", aliases: ["15"], legacyIds: ["15"], name: "G Girard Trolley", badge: "G", color: "#8CB33F", terminals: ["Richmond-Westmoreland", "63rd-Girard"] },
  D1: { id: "D1", aliases: ["101"], legacyIds: ["101"], name: "D1 Media Trolley", badge: "D1", color: "#5FAE4D", terminals: ["69th Street TC", "Media"] },
  D2: { id: "D2", aliases: ["102"], legacyIds: ["102"], name: "D2 Sharon Hill Trolley", badge: "D2", color: "#78B84A", terminals: ["69th Street TC", "Sharon Hill"] },
  P: { id: "P", aliases: ["PATCO"], legacyIds: ["PATCO"], name: "PATCO Line", badge: "P", color: "#E8204F", terminals: ["15-16th & Locust", "Lindenwold"] },
  AIR: { id: "AIR", aliases: [], legacyIds: [], name: "Airport Line", badge: "AIR", color: "#1D6F91", terminals: ["Temple", "Airport"] },
  MED: { id: "MED", aliases: [], legacyIds: [], name: "Media/Wawa Line", badge: "MED", color: "#205A6B", terminals: ["Center City", "Wawa"] },
  WIL: { id: "WIL", aliases: [], legacyIds: [], name: "Wilmington/Newark Line", badge: "WIL", color: "#17495B", terminals: ["Center City", "Newark"] },
  PAO: { id: "PAO", aliases: [], legacyIds: [], name: "Paoli/Thorndale Line", badge: "PAO", color: "#2B6575", terminals: ["Center City", "Thorndale"] },
  NOR: { id: "NOR", aliases: [], legacyIds: [], name: "Manayunk/Norristown Line", badge: "NOR", color: "#27586A", terminals: ["Center City", "Norristown"] },
  LAN: { id: "LAN", aliases: [], legacyIds: [], name: "Lansdale/Doylestown Line", badge: "LAN", color: "#2D7182", terminals: ["Center City", "Doylestown"] },
  WAR: { id: "WAR", aliases: [], legacyIds: [], name: "Warminster Line", badge: "WAR", color: "#3A7E8E", terminals: ["Center City", "Warminster"] },
  WTR: { id: "WTR", aliases: [], legacyIds: [], name: "West Trenton Line", badge: "WTR", color: "#477F93", terminals: ["Center City", "West Trenton"] },
  TRE: { id: "TRE", aliases: [], legacyIds: [], name: "Trenton Line", badge: "TRE", color: "#34697E", terminals: ["Center City", "Trenton"] },
  FOX: { id: "FOX", aliases: [], legacyIds: [], name: "Fox Chase Line", badge: "FOX", color: "#3C7587", terminals: ["Center City", "Fox Chase"] },
  CHE: { id: "CHE", aliases: [], legacyIds: [], name: "Chestnut Hill East", badge: "CHE", color: "#4D8798", terminals: ["Center City", "Chestnut Hill East"] },
  CHW: { id: "CHW", aliases: [], legacyIds: [], name: "Chestnut Hill West", badge: "CHW", color: "#5B95A4", terminals: ["Center City", "Chestnut Hill West"] },
  CYN: { id: "CYN", aliases: [], legacyIds: [], name: "Cynwyd Line", badge: "CYN", color: "#6AA2AE", terminals: ["Center City", "Cynwyd"] }
});

Object.assign(STOPS, {
  T1: [["13th Street",39.95194,-75.16104],["30th Street",39.95547,-75.18325],["36th Street Portal",39.95482,-75.1942],["Lancaster Ave",39.9676,-75.217],["Girard Ave",39.9742,-75.236],["63rd-Malvern",39.9838,-75.2478]],
  T2: [["13th Street",39.95194,-75.16104],["30th Street",39.95547,-75.18325],["40th Street Portal",39.9565,-75.20329],["Baltimore Ave",39.949,-75.219],["49th Street",39.948,-75.222],["61st-Baltimore",39.9476,-75.244]],
  T3: [["13th Street",39.95194,-75.16104],["30th Street",39.95547,-75.18325],["40th Street Portal",39.9565,-75.20329],["Chester Ave",39.947,-75.218],["Woodland Ave",39.942,-75.226],["Yeadon",39.932,-75.252],["Darby TC",39.918,-75.261]],
  T4: [["13th Street",39.95194,-75.16104],["30th Street",39.95547,-75.18325],["40th Street Portal",39.9565,-75.20329],["Woodland Ave",39.942,-75.226],["Island Ave",39.921,-75.238],["Darby TC",39.918,-75.261]],
  T5: [["13th Street",39.95194,-75.16104],["30th Street",39.95547,-75.18325],["40th Street Portal",39.9565,-75.20329],["Woodland Ave",39.942,-75.226],["Elmwood",39.919,-75.229],["Eastwick",39.891,-75.241]],
  G: [["Richmond-Westmoreland",39.985,-75.096],["Frankford-Delaware",39.969,-75.134],["Girard",39.97195,-75.15931],["Fairmount Park",39.974,-75.202],["63rd-Girard",39.969,-75.247]],
  D1: [["69th Street TC",39.96183,-75.25818],["Drexel Hill Junction",39.950,-75.302],["Springfield Rd",39.930,-75.331],["Media",39.916,-75.389]],
  D2: [["69th Street TC",39.96183,-75.25818],["Drexel Hill Junction",39.950,-75.302],["Clifton-Aldan",39.921,-75.290],["Sharon Hill",39.907,-75.271]],
  P: [["15-16th & Locust",39.948,-75.166],["8th & Market",39.95115,-75.15358],["City Hall Camden",39.945,-75.121],["Collingswood",39.918,-75.071],["Haddonfield",39.897,-75.035],["Lindenwold",39.833,-74.998]],
  AIR: [["Temple",39.981,-75.149],["30th Street",39.95547,-75.18325],["University City",39.948,-75.191],["Eastwick",39.891,-75.241],["Airport",39.874,-75.242]],
  MED: [["30th Street",39.95547,-75.18325],["49th Street",39.947,-75.219],["Lansdowne",39.938,-75.272],["Media",39.916,-75.389],["Wawa",39.901,-75.459]],
  WIL: [["30th Street",39.95547,-75.18325],["Chester",39.849,-75.360],["Marcus Hook",39.819,-75.418],["Wilmington",39.737,-75.551],["Newark",39.669,-75.753]],
  PAO: [["30th Street",39.95547,-75.18325],["Ardmore",40.008,-75.291],["Bryn Mawr",40.02195,-75.32375],["Paoli",40.042,-75.484],["Thorndale",39.992,-75.767]],
  NOR: [["30th Street",39.95547,-75.18325],["Manayunk",40.026,-75.225],["Conshohocken",40.073,-75.307],["Norristown",40.11342,-75.34424]],
  LAN: [["Temple",39.981,-75.149],["Jenkintown",40.095,-75.126],["Lansdale",40.241,-75.284],["Doylestown",40.306,-75.130]],
  WAR: [["Temple",39.981,-75.149],["Jenkintown",40.095,-75.126],["Willow Grove",40.143,-75.115],["Warminster",40.205,-75.090]],
  WTR: [["Temple",39.981,-75.149],["Jenkintown",40.095,-75.126],["Neshaminy Falls",40.151,-74.968],["West Trenton",40.258,-74.819]],
  TRE: [["Temple",39.981,-75.149],["Frankford TC",40.02387,-75.07675],["Croydon",40.087,-74.903],["Trenton",40.219,-74.754]],
  FOX: [["Temple",39.981,-75.149],["Olney",40.03682,-75.14482],["Cheltenham",40.062,-75.091],["Fox Chase",40.076,-75.080]],
  CHE: [["Temple",39.981,-75.149],["Germantown",40.037,-75.178],["Wyndmoor",40.083,-75.190],["Chestnut Hill East",40.080,-75.207]],
  CHW: [["30th Street",39.95547,-75.18325],["North Philadelphia",39.99297,-75.15472],["Queen Lane",40.026,-75.174],["Chestnut Hill West",40.070,-75.205]],
  CYN: [["30th Street",39.95547,-75.18325],["Bala",40.007,-75.229],["Cynwyd",40.011,-75.233]]
});

const ROUTE_ID_LOOKUP = new Map();
Object.values(ROUTES).forEach((route) => {
  [route.id, ...route.aliases, ...route.legacyIds].forEach((id) => {
    ROUTE_ID_LOOKUP.set(id, route.id);
  });
});

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function distanceMeters(aLat, aLon, bLat, bLon) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function nearestStop(routeId, latitude, longitude, directionId = 0) {
  const stops = STOPS[routeId] || [];
  if (stops.length === 0) return null;

  const indexed = stops
    .map(([name, lat, lon], index) => ({
      name,
      latitude: lat,
      longitude: lon,
      index,
      distance: distanceMeters(latitude, longitude, lat, lon)
    }))
    .sort((a, b) => a.distance - b.distance);

  const current = indexed[0];
  const nextIndex =
    directionId === 1
      ? Math.max(0, current.index - 1)
      : Math.min(stops.length - 1, current.index + 1);
  const next = stops[nextIndex];

  return {
    current: current.name,
    next: next?.[0] || current.name,
    distanceMeters: Math.round(current.distance),
    stopsRemaining:
      directionId === 1 ? current.index : Math.max(0, stops.length - 1 - current.index)
  };
}

function interpolateRoute(routeId, progress) {
  const stops = STOPS[routeId] || [];
  if (stops.length === 0) return null;
  const scaled = progress * (stops.length - 1);
  const fromIndex = Math.floor(scaled);
  const toIndex = Math.min(stops.length - 1, fromIndex + 1);
  const local = scaled - fromIndex;
  const from = stops[fromIndex];
  const to = stops[toIndex];
  return {
    latitude: from[1] + (to[1] - from[1]) * local,
    longitude: from[2] + (to[2] - from[2]) * local
  };
}

function routeProgressFromStop(routeId, stopName, directionId = 0) {
  const stops = STOPS[routeId] || [];
  const index = Math.max(
    0,
    stops.findIndex(([name]) => name === stopName)
  );
  const progress = stops.length <= 1 ? 0 : index / (stops.length - 1);
  return directionId === 1 ? progress : progress;
}

function scheduledGhost(routeId, progress, directionId, delaySeconds) {
  const lateStops = Math.min(2.4, Math.max(0.25, delaySeconds / 180));
  const routeLength = Math.max(1, (STOPS[routeId] || []).length - 1);
  const delta = lateStops / routeLength;
  const scheduledProgress =
    directionId === 1
      ? Math.min(1, progress + delta)
      : Math.max(0, progress - delta);
  return interpolateRoute(routeId, scheduledProgress);
}

function parseVehiclePrint(text) {
  const chunks = text.split(/\n\s*entity\s*{/g).slice(1);

  return chunks
    .map((chunk) => {
      const rawRouteId = chunk.match(/route_id:\s*"([^"]+)"/)?.[1];
      const routeId = ROUTE_ID_LOOKUP.get(rawRouteId) || rawRouteId;
      const tripId = chunk.match(/trip_id:\s*"([^"]+)"/)?.[1];
      const directionId = Number(chunk.match(/direction_id:\s*(\d+)/)?.[1] || 0);
      const vehicleId = chunk.match(/vehicle\s*{[\s\S]*?id:\s*"([^"]+)"/)?.[1];
      const label = chunk.match(/label:\s*"([^"]+)"/)?.[1] || vehicleId;
      const latitude = Number(chunk.match(/latitude:\s*([-0-9.]+)/)?.[1]);
      const longitude = Number(chunk.match(/longitude:\s*([-0-9.]+)/)?.[1]);
      const bearing = Number(chunk.match(/bearing:\s*([-0-9.]+)/)?.[1]);
      const stopId = chunk.match(/stop_id:\s*"([^"]+)"/)?.[1];
      const timestamp = Number(chunk.match(/timestamp:\s*(\d+)/)?.[1]);
      const occupancy = chunk.match(/occupancy_status:\s*([A-Z_]+)/)?.[1];

      if (!routeId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const route = ROUTES[routeId] || {
        id: routeId,
        name: `Route ${routeId}`,
        badge: routeId,
        color: "#768390",
        terminals: ["Outbound", "Inbound"]
      };
      const stop = nearestStop(route.id, latitude, longitude, directionId);
      const progress = routeProgressFromStop(route.id, stop?.current, directionId);
      const delaySeconds = 60 + Math.abs((vehicleId || label || routeId).length * 37) % 360;
      const ghost = scheduledGhost(route.id, progress, directionId, delaySeconds);

      return {
        id: vehicleId || `${routeId}-${tripId || Math.random()}`,
        label,
        tripId,
        rawRouteId,
        routeId: route.id,
        routeName: route.name,
        routeBadge: route.badge,
        routeColor: route.color,
        directionId,
        destination: route.terminals[directionId] || route.terminals[0],
        latitude,
        longitude,
        scheduledLatitude: ghost?.latitude ?? latitude,
        scheduledLongitude: ghost?.longitude ?? longitude,
        delaySeconds,
        bearing: Number.isFinite(bearing) ? bearing : null,
        stopId,
        currentStop: stop?.current || stopId || "Unknown",
        nextStop: stop?.next || "Unknown",
        stopsRemaining: stop?.stopsRemaining ?? null,
        distanceFromStopMeters: stop?.distanceMeters ?? null,
        status: stop && stop.distanceMeters < 90 ? "at station" : "moving",
        timestamp: Number.isFinite(timestamp) ? timestamp : null,
        occupancy: occupancy || null,
        mode: "live"
      };
    })
    .filter(Boolean);
}

function demoVehicles() {
  const now = Date.now();
  const activeCounts = {
    L: 16,
    B1: 12,
    B2: 3,
    B3: 2,
    M: 6,
    T1: 5,
    T2: 5,
    T3: 5,
    T4: 5,
    T5: 5,
    G: 4,
    D1: 3,
    D2: 3,
    P: 7,
    AIR: 3,
    MED: 3,
    WIL: 3,
    PAO: 4,
    NOR: 3,
    LAN: 4,
    WAR: 3,
    WTR: 3,
    TRE: 3,
    FOX: 2,
    CHE: 2,
    CHW: 2,
    CYN: 1
  };
  const routeIds = Object.entries(activeCounts).flatMap(([routeId, count]) =>
    Array.from({ length: count }, () => routeId)
  );

  return routeIds.map((routeId, index) => {
    const route = ROUTES[routeId];
    const directionId = index % 2;
    const cycle = 520 + (index % 11) * 39;
    const rawProgress = ((now / 1000 + index * 31) % cycle) / cycle;
    const progress = directionId === 1 ? 1 - rawProgress : rawProgress;
    const delaySeconds = [25, 85, 150, 235, 45, 310, 125, 70, 190][index % 9];
    const position = interpolateRoute(routeId, progress);
    const ghost = scheduledGhost(routeId, progress, directionId, delaySeconds);
    const stop = nearestStop(routeId, position.latitude, position.longitude, directionId);

    return {
      id: `demo-${routeId}-${index + 1}`,
      label: `${route.badge}${1000 + index * 17}`,
      tripId: `demo-trip-${index + 1}`,
      rawRouteId: route.id,
      routeId,
      routeName: route.name,
      routeBadge: route.badge,
      routeColor: route.color,
      directionId,
      destination: route.terminals[directionId],
      latitude: position.latitude,
      longitude: position.longitude,
      scheduledLatitude: ghost.latitude,
      scheduledLongitude: ghost.longitude,
      delaySeconds,
      bearing: directionId === 1 ? 240 : 60,
      stopId: null,
      currentStop: stop.current,
      nextStop: stop.next,
      stopsRemaining: stop.stopsRemaining,
      distanceFromStopMeters: stop.distanceMeters,
      status: stop.distanceMeters < 90 ? "at station" : "moving",
      timestamp: Math.floor(now / 1000),
      occupancy: index % 3 === 0 ? "MANY_SEATS_AVAILABLE" : "FEW_SEATS_AVAILABLE",
      mode: "demo"
    };
  });
}

function parseServiceAlerts(text) {
  const chunks = text.split(/\n\s*entity\s*{/g).slice(1);
  const alerts = chunks
    .map((chunk, index) => {
      const id = chunk.match(/id:\s*"([^"]+)"/)?.[1] || `alert-${index + 1}`;
      const cause = chunk.match(/cause:\s*([A-Z_]+)/)?.[1] || "UNKNOWN_CAUSE";
      const effect = chunk.match(/effect:\s*([A-Z_]+)/)?.[1] || "UNKNOWN_EFFECT";
      const routes = [...chunk.matchAll(/route_id:\s*"([^"]+)"/g)]
        .map((match) => ROUTE_ID_LOOKUP.get(match[1]) || match[1])
        .filter((routeId) => ROUTES[routeId]);
      const textBlocks = [...chunk.matchAll(/text:\s*"([^"]+)"/g)].map(
        (match) => match[1]
      );
      const header = textBlocks[0] || cause.replaceAll("_", " ").toLowerCase();
      const description = textBlocks.find((value) => value !== header) || header;

      if (routes.length === 0 && !/delay|service|equipment|suspend|shuttle|detour|cancel/i.test(description)) {
        return null;
      }

      return {
        id,
        cause,
        effect,
        routes,
        header,
        description
      };
    })
    .filter(Boolean);

  return alerts.slice(0, 5);
}

function cleanGtfsText(text) {
  return text
    .replaceAll("<br>", "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

function parseTripUpdates(text, sourceName) {
  const clean = cleanGtfsText(text);
  const chunks = clean.split(/\n\s*entity\s*{/g).slice(1);

  return chunks
    .map((chunk) => {
      const rawRouteId = chunk.match(/route_id:\s*"([^"]+)"/)?.[1];
      const routeId = ROUTE_ID_LOOKUP.get(rawRouteId) || rawRouteId;
      const route = ROUTES[routeId];
      if (!route) return null;

      const tripId = chunk.match(/trip_id:\s*"([^"]+)"/)?.[1] || chunk.match(/id:\s*"([^"]+)"/)?.[1];
      const directionId = Number(chunk.match(/direction_id:\s*(\d+)/)?.[1] || 0);
      const vehicleId = chunk.match(/vehicle\s*{[\s\S]*?id:\s*"([^"]+)"/)?.[1];
      const scheduleRelationship =
        chunk.match(/trip\s*{[\s\S]*?schedule_relationship:\s*([A-Z_]+)/)?.[1] ||
        chunk.match(/schedule_relationship:\s*([A-Z_]+)/)?.[1] ||
        "SCHEDULED";
      const delayValues = [...chunk.matchAll(/delay:\s*(-?\d+)/g)]
        .map((match) => Number(match[1]))
        .filter(Number.isFinite);
      const maxDelay = delayValues.length > 0 ? Math.max(...delayValues) : 0;
      const latestDelay = delayValues.at(-1) ?? maxDelay;
      const stopSequence = [...chunk.matchAll(/stop_sequence:\s*(\d+)/g)].map((match) => Number(match[1])).at(-1);
      const stopId = [...chunk.matchAll(/stop_id:\s*"([^"]+)"/g)].map((match) => match[1]).at(-1);

      if (maxDelay < 60 && scheduleRelationship !== "CANCELED") return null;

      const tripLabel = tripId?.split("_")[0] || route.name;

      return {
        id: `${sourceName}:${tripId}`,
        source: sourceName,
        tripId,
        vehicleId: vehicleId || tripId,
        label: `${route.name} trip`,
        shortLabel: tripLabel,
        vehicleConsist: vehicleId || null,
        routeId: route.id,
        routeName: route.name,
        routeBadge: route.badge,
        routeColor: route.color,
        directionId,
        destination: route.terminals[directionId] || route.terminals[0],
        maxDelay,
        latestDelay,
        stopSequence: Number.isFinite(stopSequence) ? stopSequence : null,
        stopId: stopId || null,
        status: scheduleRelationship === "CANCELED" ? "canceled" : "delayed",
        updatedAt: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

async function handleApi(req, res) {
  if (req.url === "/api/routes") {
    json(res, 200, {
      routes: Object.values(ROUTES).map((route) => ({
        ...route,
        stops: STOPS[route.id].map(([name, latitude, longitude]) => ({
          name,
          latitude,
          longitude
        }))
      }))
    });
    return;
  }

  if (req.url?.startsWith("/api/vehicles")) {
    try {
      const response = await fetch(SEPTA_VEHICLE_PRINT, {
        headers: { "user-agent": "philly-metro-live-starter/0.2" }
      });

      if (!response.ok) {
        throw new Error(`SEPTA returned ${response.status}`);
      }

      const text = await response.text();
      const allVehicles = parseVehiclePrint(text);
      const trackedRoutes = new Set(Object.keys(ROUTES));
      const liveMetroVehicles = allVehicles.filter((vehicle) =>
        trackedRoutes.has(vehicle.routeId)
      );
      const vehicles = liveMetroVehicles.length > 0 ? liveMetroVehicles : demoVehicles();

      json(res, 200, {
        generatedAt: new Date().toISOString(),
        source: SEPTA_VEHICLE_PRINT,
        mode: liveMetroVehicles.length > 0 ? "live" : "demo",
        trackedRouteIds: [...trackedRoutes],
        vehicles,
        allVehicleSampleCount: allVehicles.length,
        note:
          liveMetroVehicles.length === 0
            ? "SEPTA's public vehicle feed did not include Metro trains in this snapshot, so this view is using simulated train movement for interaction development. The same UI will switch to live data when matching route IDs appear."
            : null
      });
    } catch (error) {
      json(res, 502, {
        error: "Unable to fetch SEPTA real-time vehicle data",
        detail: error.message
      });
    }
    return;
  }

  if (req.url?.startsWith("/api/delays")) {
    try {
      const [metroResponse, railResponse] = await Promise.all([
        fetch(SEPTA_TRIP_PRINT, {
          headers: { "user-agent": "septascope-starter/0.4" }
        }),
        fetch(SEPTA_RAIL_TRIP_PRINT, {
          headers: { "user-agent": "septascope-starter/0.4" }
        })
      ]);

      if (!metroResponse.ok) throw new Error(`SEPTA metro trip feed returned ${metroResponse.status}`);
      if (!railResponse.ok) throw new Error(`SEPTA rail trip feed returned ${railResponse.status}`);

      const [metroText, railText] = await Promise.all([
        metroResponse.text(),
        railResponse.text()
      ]);
      const delays = [
        ...parseTripUpdates(metroText, "septa-pa-us"),
        ...parseTripUpdates(railText, "septarail-pa-us")
      ].sort((a, b) => {
        if (a.status !== b.status) return a.status === "canceled" ? -1 : 1;
        return b.maxDelay - a.maxDelay;
      });

      json(res, 200, {
        generatedAt: new Date().toISOString(),
        sources: [SEPTA_TRIP_PRINT, SEPTA_RAIL_TRIP_PRINT],
        delays
      });
    } catch (error) {
      json(res, 200, {
        generatedAt: new Date().toISOString(),
        sources: [SEPTA_TRIP_PRINT, SEPTA_RAIL_TRIP_PRINT],
        delays: [],
        error: error.message
      });
    }
    return;
  }

  if (req.url?.startsWith("/api/alerts")) {
    try {
      const response = await fetch(SEPTA_SERVICE_ALERT_PRINT, {
        headers: { "user-agent": "philly-metro-live-starter/0.3" }
      });

      if (!response.ok) {
        throw new Error(`SEPTA returned ${response.status}`);
      }

      const text = await response.text();
      json(res, 200, {
        generatedAt: new Date().toISOString(),
        source: SEPTA_SERVICE_ALERT_PRINT,
        alerts: parseServiceAlerts(text)
      });
    } catch (error) {
      json(res, 200, {
        generatedAt: new Date().toISOString(),
        source: SEPTA_SERVICE_ALERT_PRINT,
        alerts: [],
        error: error.message
      });
    }
    return;
  }

  json(res, 404, { error: "Unknown API route" });
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(
    new URL(req.url, `http://localhost:${PORT}`).pathname
  );
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath === "/" ? "index.html" : safePath);

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`SeptaScope running at http://${HOST}:${PORT}`);
});
