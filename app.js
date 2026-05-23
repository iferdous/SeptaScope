const PHILLY_CENTER = [39.9576, -75.1642];
const REFRESH_MS = 15000;
const DELAY_REFRESH_MS = 60000;

const map = L.map("map", {
  center: PHILLY_CENTER,
  zoom: 12,
  zoomControl: false,
  preferCanvas: true
});
window.__debugMap = map;

const openFreeMapStyles = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/liberty"
};

const fallbackTileLayers = {
  dark: () => L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  }),
  light: () => L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  })
};

let theme = localStorage.getItem("philly-metro-theme") || "dark";
let baseLayer = createBaseLayer(theme);
baseLayer.addTo(map);
document.documentElement.dataset.theme = theme;

const els = {
  lineFilters: document.querySelector("#line-filters"),
  activeCount: document.querySelector("#active-count"),
  lineMode: document.querySelector("#line-mode"),
  updatedAt: document.querySelector("#updated-at"),
  refresh: document.querySelector("#refresh"),
  locate: document.querySelector("#locate"),
  buildingsToggle: document.querySelector("#buildings-toggle"),
  themeToggle: document.querySelector("#theme-toggle"),
  reportOpen: document.querySelector("#report-open"),
  reportClose: document.querySelector("#report-close"),
  reportPanel: document.querySelector("#report-panel"),
  reportOptions: document.querySelector("#report-options"),
  reportContext: document.querySelector("#report-context"),
  reportHelper: document.querySelector("#report-helper"),
  reportDetail: document.querySelector("#report-detail"),
  reportNote: document.querySelector("#report-note"),
  reportBack: document.querySelector("#report-back"),
  reportSubmit: document.querySelector("#report-submit"),
  pulsePanel: document.querySelector("#pulse-panel"),
  pulseTitle: document.querySelector("#pulse-title"),
  pulseUpdated: document.querySelector("#pulse-updated"),
  moodTarget: document.querySelector("#mood-target"),
  moodActions: document.querySelector("#mood-actions"),
  moodPicker: document.querySelector("#mood-picker"),
  moodFeed: document.querySelector("#mood-feed"),
  delaySource: document.querySelector("#delay-source"),
  delayBoard: document.querySelector("#delay-board"),
  surgeWindow: document.querySelector("#surge-window"),
  surgeList: document.querySelector("#surge-list"),
  streakBadge: document.querySelector("#streak-badge"),
  tripCount: document.querySelector("#trip-count"),
  tripMiles: document.querySelector("#trip-miles"),
  favoriteLine: document.querySelector("#favorite-line"),
  wrappedCard: document.querySelector("#wrapped-card"),
  alertBanner: document.querySelector("#alert-banner"),
  feedNote: document.querySelector("#feed-note"),
  clickHint: document.querySelector("#click-hint"),
  trainCard: document.querySelector("#train-card"),
  cardBadge: document.querySelector("#card-badge"),
  cardRoute: document.querySelector("#card-route"),
  cardTitle: document.querySelector("#card-title"),
  cardTrainId: document.querySelector("#card-train-id"),
  cardStatus: document.querySelector("#card-status"),
  cardLocation: document.querySelector("#card-location"),
  cardNextStop: document.querySelector("#card-next-stop"),
  cardDestination: document.querySelector("#card-destination"),
  cardStops: document.querySelector("#card-stops"),
  cardDelay: document.querySelector("#card-delay"),
  rideAlong: document.querySelector("#ride-along"),
  logTrip: document.querySelector("#log-trip"),
  tripLogForm: document.querySelector("#trip-log-form"),
  tripBoardStop: document.querySelector("#trip-board-stop"),
  tripAlightStop: document.querySelector("#trip-alight-stop"),
  tripDistancePreview: document.querySelector("#trip-distance-preview"),
  tripLogCancel: document.querySelector("#trip-log-cancel"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out")
};

let routes = [];
let vehicles = [];
let routeLayers = [];
let stationLayers = [];
let trainLayers = [];
let ghostLayers = [];
let pulseLayers = [];
let moodLayers = [];
let markerByVehicleId = new Map();
let selectedRouteId = "ALL";
let selectedVehicleId = null;
let selectedStation = null;
let rideAlong = false;
let buildingsEnabled = localStorage.getItem("septascope-buildings") === "true";
let baseMapReady = false;
let reports = JSON.parse(localStorage.getItem("philly-metro-reports") || "[]");
let moodReactions = JSON.parse(localStorage.getItem("philly-metro-moods") || "[]");
let customMoodTypes = JSON.parse(localStorage.getItem("septascope-custom-moods") || "[]");
let tripLogs = JSON.parse(localStorage.getItem("philly-metro-trip-logs") || "[]");
let delayStats = JSON.parse(localStorage.getItem("philly-metro-delay-stats") || "{}");
let realtimeDelays = [];
let delayFeedAt = null;
let delayFeedError = null;
let feedMode = "demo";
let alertIndex = 0;
let currentAlerts = [];
let pendingReportType = null;

const reportTypes = [
  { id: "door-holding", label: "Door holding", icon: "DH", target: "train" },
  { id: "crowded-car", label: "Overcrowded car", icon: "OC", target: "train" },
  { id: "climate", label: "Broken AC/heat", icon: "AC", target: "train" },
  { id: "safety", label: "Sketchy situation", icon: "SF", target: "train" },
  { id: "elevator", label: "Elevator/escalator down", icon: "EL", target: "station" },
  { id: "platform-flow", label: "Platform blocked", icon: "PF", target: "station" },
  { id: "fare-gate", label: "Fare gate broken", icon: "FG", target: "station" }
];

const defaultMoodTypes = [
  { emoji: "🎵", label: "good busker" },
  { emoji: "🌊", label: "flooding" },
  { emoji: "🔥", label: "platform heat" },
  { emoji: "🧊", label: "good AC" },
  { emoji: "✨", label: "smooth ride" }
];

const moodLibrary = [
  { emoji: "😌", label: "calm platform" },
  { emoji: "😤", label: "frustrated crowd" },
  { emoji: "🥵", label: "too hot" },
  { emoji: "🥶", label: "too cold" },
  { emoji: "☔", label: "wet platform" },
  { emoji: "🧼", label: "clean station" },
  { emoji: "🚧", label: "blocked path" },
  { emoji: "🔊", label: "very loud" },
  { emoji: "🪑", label: "seats open" },
  { emoji: "⚡", label: "moving fast" },
  { emoji: "🐢", label: "slow crawl" },
  { emoji: "👀", label: "keep watch" }
];

const routeGroups = {
  ALL: { label: "All", ids: null },
  L: { label: "Market-Frankford Line", ids: ["L"], count: true },
  BSL: {
    label: "Broad Street Line",
    ids: ["B1", "B2", "B3"],
    count: true,
    menu: ["B1", "B2", "B3"]
  },
  M: { label: "Norristown High Speed Line", ids: ["M"], count: true },
  P: { label: "PATCO Line", ids: ["P"], count: true },
  TROLLEY: {
    label: "Trolleys",
    ids: ["T1", "T2", "T3", "T4", "T5", "G", "D1", "D2"],
    menu: ["T1", "T2", "T3", "T4", "T5", "G", "D1", "D2"]
  },
  REGIONAL: {
    label: "Regional Rail",
    ids: ["AIR", "MED", "WIL", "PAO", "NOR", "LAN", "WAR", "WTR", "TRE", "FOX", "CHE", "CHW", "CYN"],
    menu: ["AIR", "MED", "WIL", "PAO", "NOR", "LAN", "WAR", "WTR", "TRE", "FOX", "CHE", "CHW", "CYN"]
  }
};

function formatClock(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDelay(seconds = 0) {
  if (seconds < 45) return "on time";
  return `${Math.round(seconds / 60)}m late vs schedule`;
}

function formatMinutes(seconds = 0) {
  if (seconds < 60) return "<1m";
  return `${Math.round(seconds / 60)}m`;
}

function fullDateLabel(value = Date.now()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function timeRangeLabel(startHour, endHour) {
  const base = new Date();
  const start = new Date(base);
  const end = new Date(base);
  start.setHours(startHour, 0, 0, 0);
  end.setHours(endHour, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${formatter.format(start)}-${formatter.format(end)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeAttribute(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function visibleVehicles() {
  const ids = selectedRouteIds();
  return ids === null
    ? vehicles
    : vehicles.filter((vehicle) => ids.includes(vehicle.routeId));
}

function selectedRouteIds() {
  if (selectedRouteId === "ALL") return null;
  if (routeGroups[selectedRouteId]) return routeGroups[selectedRouteId].ids;
  return [selectedRouteId];
}

function routeCount(routeIds) {
  return vehicles.filter((vehicle) => routeIds.includes(vehicle.routeId)).length;
}

function createBaseLayer(nextTheme) {
  if (L.maplibreGL && window.maplibregl) {
    return L.maplibreGL({
      style: openFreeMapStyles[nextTheme],
      attribution: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"
    });
  }
  return fallbackTileLayers[nextTheme]();
}

function vectorMap() {
  return baseLayer?.getMaplibreMap?.() || null;
}

function firstSymbolLayerId(glMap) {
  return glMap
    .getStyle()
    .layers.find((layer) => layer.type === "symbol")?.id;
}

function configureVectorBuildings() {
  const glMap = vectorMap();
  if (!glMap) return;

  const apply = () => {
    baseMapReady = true;
    if (!glMap.getSource("septascope-openmaptiles")) {
      glMap.addSource("septascope-openmaptiles", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet"
      });
    }

    if (!glMap.getLayer("septascope-3d-buildings")) {
      glMap.addLayer(
        {
          id: "septascope-3d-buildings",
          type: "fill-extrusion",
          source: "septascope-openmaptiles",
          "source-layer": "building",
          minzoom: 14,
          layout: {
            visibility: buildingsEnabled ? "visible" : "none"
          },
          paint: {
            "fill-extrusion-color":
              theme === "dark" ? "#59564f" : "#a8adaf",
            "fill-extrusion-height": [
              "coalesce",
              ["to-number", ["get", "render_height"]],
              ["to-number", ["get", "height"]],
              ["*", ["coalesce", ["to-number", ["get", "building:levels"]], 4], 3],
              10
            ],
            "fill-extrusion-base": [
              "coalesce",
              ["to-number", ["get", "render_min_height"]],
              ["to-number", ["get", "min_height"]],
              0
            ],
            "fill-extrusion-opacity": theme === "dark" ? 0.72 : 0.58
          }
        },
        firstSymbolLayerId(glMap)
      );
    }

    glMap.setLayoutProperty(
      "septascope-3d-buildings",
      "visibility",
      buildingsEnabled ? "visible" : "none"
    );
    glMap.setPaintProperty(
      "septascope-3d-buildings",
      "fill-extrusion-color",
      theme === "dark" ? "#59564f" : "#a8adaf"
    );
    glMap.setPaintProperty(
      "septascope-3d-buildings",
      "fill-extrusion-opacity",
      theme === "dark" ? 0.72 : 0.58
    );

    if (glMap.setPitch) {
      glMap.setPitch(buildingsEnabled ? 38 : 0);
    }
  };

  if (glMap.isStyleLoaded()) {
    apply();
  } else {
    glMap.once("load", apply);
  }
}

function displayCount(routeIds) {
  const count = routeCount(routeIds);
  return feedMode === "live" ? String(count) : `~${count}`;
}

function saveLocalState() {
  localStorage.setItem("philly-metro-moods", JSON.stringify(moodReactions));
  localStorage.setItem("septascope-custom-moods", JSON.stringify(customMoodTypes));
  localStorage.setItem("philly-metro-trip-logs", JSON.stringify(tripLogs));
  localStorage.setItem("philly-metro-delay-stats", JSON.stringify(delayStats));
}

function localDateKey(value = Date.now()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDaysKey(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date.getTime());
}

function routeLengthMiles(routeId) {
  const route = getRoute(routeId);
  if (!route) return 0;
  const meters = route.stops.slice(1).reduce((total, stop, index) => {
    const previous = route.stops[index];
    return (
      total +
      distanceMeters(
        previous.latitude,
        previous.longitude,
        stop.latitude,
        stop.longitude
      )
    );
  }, 0);
  return meters / 1609.344;
}

function stopIndexForVehicle(route, vehicle) {
  if (!route) return -1;
  const currentIndex = route.stops.findIndex((stop) => stop.name === vehicle.currentStop);
  if (currentIndex >= 0) return currentIndex;
  return route.stops.reduce(
    (best, stop, index) => {
      const distance = distanceMeters(
        vehicle.latitude,
        vehicle.longitude,
        stop.latitude,
        stop.longitude
      );
      return distance < best.distance ? { index, distance } : best;
    },
    { index: -1, distance: Infinity }
  ).index;
}

function segmentMiles(routeId, fromIndex, toIndex) {
  const route = getRoute(routeId);
  if (!route || fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 0;

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const meters = route.stops.slice(start + 1, end + 1).reduce((total, stop, offset) => {
    const previous = route.stops[start + offset];
    return (
      total +
      distanceMeters(
        previous.latitude,
        previous.longitude,
        stop.latitude,
        stop.longitude
      )
    );
  }, 0);
  return meters / 1609.344;
}

function tripDirectionStep(vehicle) {
  return vehicle.directionId === 1 ? -1 : 1;
}

function activeReportTarget() {
  const train = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  if (train) {
    return {
      type: "train",
      id: train.id,
      label: `${train.label} · ${train.routeName}`,
      latitude: train.latitude,
      longitude: train.longitude,
      routeId: train.routeId
    };
  }

  if (selectedStation) {
    return selectedStation;
  }

  const center = map.getCenter();
  return {
    type: "map",
    id: "map-center",
    label: "Map location",
    latitude: center.lat,
    longitude: center.lng,
    routeId: selectedRouteId
  };
}

function activeMoodTarget() {
  if (selectedStation) return selectedStation;

  const train = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  if (!train) return null;

  const route = getRoute(train.routeId);
  const stop = route?.stops.find((candidate) => candidate.name === train.currentStop);
  if (!route || !stop) return null;

  return {
    type: "station",
    id: `${route.id}:${stop.name}`,
    label: `${stop.name} · ${route.name}`,
    stationName: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    routeId: route.id
  };
}

function reportTargetForType(type) {
  const target = activeReportTarget();
  if (type.target === "station") {
    if (target.type === "station") return target;
    const stationTarget = activeMoodTarget();
    if (stationTarget) return stationTarget;
  }
  return target;
}

function pruneReports() {
  const expiresAfter = 20 * 60 * 1000;
  reports = reports.filter((report) => Date.now() - report.createdAt < expiresAfter);
  localStorage.setItem("philly-metro-reports", JSON.stringify(reports));
}

function pruneMoodReactions() {
  const expiresAfter = 6 * 60 * 60 * 1000;
  moodReactions = moodReactions.filter(
    (reaction) => Date.now() - reaction.createdAt < expiresAfter
  );
}

function routeCategory(routeId) {
  if (["L", "B1", "B2", "B3", "M"].includes(routeId)) return "Metro";
  if (routeId.startsWith("T") || ["G", "D1", "D2"].includes(routeId)) return "Trolley";
  if (routeId === "P") return "PATCO";
  return "Regional Rail";
}

function getRoute(routeId) {
  return routes.find((route) => route.id === routeId);
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

function clearLayers(layers) {
  layers.forEach((layer) => map.removeLayer(layer));
  layers.length = 0;
}

function setBuildingsEnabled(enabled) {
  buildingsEnabled = enabled;
  localStorage.setItem("septascope-buildings", String(enabled));
  els.buildingsToggle.classList.toggle("active", enabled);
  configureVectorBuildings();
}

function trainIcon(vehicle, selected = false) {
  const rotate = vehicle.bearing || 0;
  return L.divIcon({
    className: "",
    html: `
      <button class="train-marker ${selected ? "selected" : ""}" style="--route:${vehicle.routeColor}; --bearing:${rotate}deg" title="${vehicle.routeName} ${vehicle.label}">
        <span class="train-nose"></span>
        <span class="train-window-row"><i></i><i></i><i></i></span>
        <span class="train-label">${vehicle.routeBadge}</span>
      </button>
    `,
    iconSize: [54, 34],
    iconAnchor: [27, 17]
  });
}

function ghostIcon(vehicle) {
  return L.divIcon({
    className: "",
    html: `<span class="ghost-train" title="Where ${vehicle.label} should be if on schedule">${vehicle.routeBadge}</span>`,
    iconSize: [42, 24],
    iconAnchor: [21, 12]
  });
}

function stationIcon(pulsing = false) {
  return L.divIcon({
    className: "",
    html: `<span class="station-dot ${pulsing ? "pulse" : ""}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function stationLabelIcon(stop, pulsing = false) {
  return L.divIcon({
    className: "",
    html: `
      <span class="station-pin ${pulsing ? "pulse" : ""}">
        <i></i><strong>${stop.name}</strong>
      </span>
    `,
    iconSize: [180, 28],
    iconAnchor: [8, 14]
  });
}

function selectStation(route, stop) {
  selectedVehicleId = null;
  selectedStation = {
    type: "station",
    id: `${route.id}:${stop.name}`,
    label: `${stop.name} · ${route.name}`,
    stationName: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    routeId: route.id
  };
  updateTrainCard(null);
  updateReportContext();
  renderPulsePanel();
  if (!els.reportPanel.classList.contains("hidden")) renderReportOptions();
  map.flyTo([stop.latitude, stop.longitude], Math.max(map.getZoom(), 15), {
    duration: 0.6
  });
}

function stationIsPulsing(stop) {
  return visibleVehicles().some((vehicle) => {
    const isApproachStop =
      vehicle.nextStop === stop.name || vehicle.currentStop === stop.name;
    const meters = distanceMeters(
      vehicle.latitude,
      vehicle.longitude,
      stop.latitude,
      stop.longitude
    );
    return isApproachStop && meters < 800;
  });
}

function drawRoutes() {
  clearLayers(routeLayers);
  clearLayers(stationLayers);

  routes.forEach((route) => {
    const stopLatLngs = route.stops.map((stop) => [stop.latitude, stop.longitude]);
    const selectedIdsForRoute = selectedRouteIds();
    const isDimmed =
      selectedIdsForRoute !== null && !selectedIdsForRoute.includes(route.id);
    const halo = L.polyline(stopLatLngs, {
      color: theme === "dark" ? "#ffffff" : "#0b1622",
      weight: isDimmed ? 5 : 13,
      opacity: isDimmed ? 0.04 : 0.11,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);
    const line = L.polyline(stopLatLngs, {
      color: route.color,
      weight: isDimmed ? 3 : 7,
      opacity: isDimmed ? 0.18 : 0.94,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    routeLayers.push(halo, line);

    route.stops.forEach((stop, index) => {
      const ids = selectedRouteIds();
      const showNames = selectedRouteId !== "ALL" && ids?.includes(route.id);
      if (!showNames && index % 2 !== 0 && selectedRouteId === "ALL") return;
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: showNames
          ? stationLabelIcon(stop, stationIsPulsing(stop))
          : stationIcon(stationIsPulsing(stop)),
        interactive: showNames
      }).addTo(map);
      if (showNames) {
        marker.on("click", () => selectStation(route, stop));
      }
      stationLayers.push(marker);
    });

    const midpoint = route.stops[Math.floor(route.stops.length / 2)];
    const label = L.marker([midpoint.latitude, midpoint.longitude], {
      icon: L.divIcon({
        className: "route-label",
        html: route.name,
        iconSize: [190, 20],
        iconAnchor: [95, 10]
      }),
      interactive: false
    }).addTo(map);
    stationLayers.push(label);
  });
}

function renderLineFilters() {
  els.lineFilters.innerHTML = "";

  const makeButton = (id, label, color, count) => {
    const button = document.createElement("button");
    button.className = `line-chip ${selectedRouteId === id ? "active" : ""}`;
    button.type = "button";
    if (color) button.style.background = color;
    button.innerHTML = `<span>${label}</span>${count ? `<em>${count}</em>` : ""}`;
    button.title =
      count && feedMode !== "live"
        ? `${label}: estimated display count; live vehicle feed unavailable`
        : label;
    button.addEventListener("click", () => selectRoute(id));
    return button;
  };

  els.lineFilters.append(makeButton("ALL", "All", null));
  els.lineFilters.append(
    makeButton("L", "Market-Frankford Line", getRoute("L")?.color, displayCount(["L"]))
  );

  els.lineFilters.append(
    makeRouteSelect("BSL", routeGroups.BSL.menu, "Broad Street Line", {
      color: getRoute("B1")?.color,
      count: displayCount(routeGroups.BSL.ids)
    })
  );

  els.lineFilters.append(
    makeButton("M", "Norristown High Speed Line", getRoute("M")?.color, displayCount(["M"]))
  );
  els.lineFilters.append(
    makeButton("P", "PATCO Line", getRoute("P")?.color, displayCount(["P"]))
  );
  els.lineFilters.append(
    makeRouteSelect("TROLLEY", routeGroups.TROLLEY.menu, "Trolley routes", {
      color: "#2f8f46"
    })
  );
  els.lineFilters.append(
    makeRouteSelect("REGIONAL", routeGroups.REGIONAL.menu, "Regional Rail lines", {
      color: "#2d7182"
    })
  );
}

function makeRouteSelect(groupId, routeIds, label, chip = null) {
  const wrapper = document.createElement("label");
  wrapper.className = `${chip ? "select-route chip-select" : "select-route"} ${
    selectedRouteId === groupId || routeIds.includes(selectedRouteId) ? "active" : ""
  }`;
  if (chip && !chip.count) wrapper.classList.add("simple-chip-select");
  if (chip?.color) wrapper.style.setProperty("--chip-color", chip.color);
  wrapper.innerHTML = `<span>${label}</span>${chip?.count ? `<em>${chip.count}</em>` : ""}`;
  const select = document.createElement("select");
  const groupOption = document.createElement("option");
  groupOption.value = groupId;
  groupOption.textContent = `All ${routeGroups[groupId].label}`;
  select.append(groupOption);
  routeIds.forEach((routeId) => {
    const route = getRoute(routeId);
    const option = document.createElement("option");
    option.value = route.id;
    option.textContent = route.name;
    select.append(option);
  });
  select.value = routeIds.includes(selectedRouteId) ? selectedRouteId : groupId;
  select.addEventListener("change", (event) => selectRoute(event.target.value));
  wrapper.append(select);
  return wrapper;
}

function renderGhosts() {
  clearLayers(ghostLayers);

  visibleVehicles().forEach((vehicle) => {
    if (!vehicle.scheduledLatitude || !vehicle.scheduledLongitude) return;
    const ghost = L.circleMarker([vehicle.scheduledLatitude, vehicle.scheduledLongitude], {
      radius: selectedRouteId === "ALL" ? 5 : 7,
      color: vehicle.routeColor,
      weight: 2,
      opacity: 0.55,
      fillColor: "#ffffff",
      fillOpacity: 0.18,
      interactive: false
    }).addTo(map);
    const gap = L.polyline(
      [
        [vehicle.scheduledLatitude, vehicle.scheduledLongitude],
        [vehicle.latitude, vehicle.longitude]
      ],
      {
        color: vehicle.routeColor,
        weight: 2,
        opacity: vehicle.delaySeconds > 45 ? 0.72 : 0.18,
        dashArray: "6 8",
        lineCap: "round"
      }
    ).addTo(map);
    ghostLayers.push(gap, ghost);
  });
}

function renderMarkers() {
  markerByVehicleId.forEach((marker) => map.removeLayer(marker));
  clearLayers(trainLayers);
  markerByVehicleId = new Map();

  visibleVehicles().forEach((vehicle) => {
    const marker = L.marker([vehicle.latitude, vehicle.longitude], {
      icon: trainIcon(vehicle, vehicle.id === selectedVehicleId),
      riseOnHover: true
    }).addTo(map);
    marker.on("click", () => selectVehicle(vehicle.id, true));
    markerByVehicleId.set(vehicle.id, marker);
    trainLayers.push(marker);
  });
}

function renderReports() {
  clearLayers(pulseLayers);
  pruneReports();
  reports.slice(-40).forEach((report) => {
    const marker = L.marker([report.latitude, report.longitude], {
      icon: L.divIcon({
        className: "",
        html: `<button class="report-marker ${report.type}" title="${escapeAttribute(`${report.label} · ${report.targetLabel}${report.note ? ` · ${report.note}` : ""}`)}">${report.icon}</button>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(map);
    pulseLayers.push(marker);
  });
}

function renderMoodMarkers() {
  clearLayers(moodLayers);
  pruneMoodReactions();
  const grouped = moodReactions.reduce((acc, reaction) => {
    const key = reaction.stationId;
    const current = acc.get(key) || {
      ...reaction,
      count: 0,
      emojis: new Map()
    };
    current.count += 1;
    current.emojis.set(reaction.emoji, (current.emojis.get(reaction.emoji) || 0) + 1);
    acc.set(key, current);
    return acc;
  }, new Map());

  [...grouped.values()].slice(-24).forEach((reaction) => {
    const emoji = [...reaction.emojis.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "✨";
    const marker = L.marker([reaction.latitude, reaction.longitude], {
      icon: L.divIcon({
        className: "",
        html: `<span class="mood-marker" title="${reaction.stationName}: ${reaction.count} mood reactions">${emoji}<small>${reaction.count}</small></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      }),
      interactive: false
    }).addTo(map);
    moodLayers.push(marker);
  });
  saveLocalState();
}

function refreshMapLayers() {
  drawRoutes();
  renderDynamicLayers();
}

function renderDynamicLayers() {
  renderGhosts();
  renderMarkers();
  renderReports();
  renderMoodMarkers();
}

function updateTrainCard(vehicle) {
  if (!vehicle) {
    els.trainCard.classList.add("hidden");
    els.clickHint.classList.toggle("hidden", selectedRouteId !== "ALL");
    return;
  }

  els.clickHint.classList.add("hidden");
  els.trainCard.classList.remove("hidden");
  els.cardBadge.textContent = vehicle.routeBadge;
  els.cardBadge.style.background = vehicle.routeColor;
  els.cardRoute.textContent = vehicle.routeName;
  els.cardTitle.textContent = `${vehicle.routeBadge} train`;
  els.cardTrainId.textContent = `${vehicle.label || vehicle.id} ${vehicle.destination ? `→ ${vehicle.destination}` : ""}`;
  els.cardStatus.textContent = vehicle.status || "moving";
  els.cardLocation.textContent =
    vehicle.distanceFromStopMeters === null
      ? vehicle.currentStop
      : `${vehicle.currentStop} (${vehicle.distanceFromStopMeters}m)`;
  els.cardNextStop.textContent = vehicle.nextStop || "--";
  els.cardDestination.textContent = vehicle.destination || "--";
  els.cardStops.textContent =
    vehicle.stopsRemaining === null ? "--" : String(vehicle.stopsRemaining);
  els.cardDelay.textContent = `${formatDelay(vehicle.delaySeconds)} · faded ghost shows scheduled position`;
  els.rideAlong.classList.toggle("active", rideAlong);
}

function updateReportContext() {
  const target = activeReportTarget();
  els.reportContext.textContent =
    target.type === "train"
      ? `Report on train ${target.label}`
      : target.type === "station"
        ? `Report at ${target.label}`
        : "Report at map location";
  els.reportHelper.textContent =
    target.type === "train"
      ? "Train issues expire in 20 minutes and follow this train ID."
      : target.type === "station"
        ? "Station issues expire in 20 minutes and pin to this stop."
        : "Select a train or station for the most precise report.";
}

function selectVehicle(vehicleId, pan = false) {
  selectedVehicleId = vehicleId;
  selectedStation = null;
  els.tripLogForm.classList.add("hidden");
  const vehicle = vehicles.find((candidate) => candidate.id === vehicleId);
  updateTrainCard(vehicle);
  updateReportContext();
  renderPulsePanel();
  if (!els.reportPanel.classList.contains("hidden")) renderReportOptions();
  renderMarkers();

  if (vehicle && pan) {
    map.flyTo([vehicle.latitude, vehicle.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.8
    });
  }
}

function selectRoute(routeId) {
  selectedRouteId = routeId;
  selectedVehicleId = null;
  selectedStation = null;
  rideAlong = false;
  els.tripLogForm.classList.add("hidden");
  els.lineMode.textContent = routeGroups[routeId]?.label || getRoute(routeId)?.name || routeId;
  updateTrainCard(null);
  renderLineFilters();
  refreshMapLayers();
  renderPulsePanel();

  const ids = selectedRouteIds();
  const points =
    ids === null
      ? routes.flatMap((route) =>
          route.stops.map((stop) => [stop.latitude, stop.longitude])
        )
      : routes
          .filter((route) => ids.includes(route.id))
          .flatMap((route) => route.stops.map((stop) => [stop.latitude, stop.longitude]));

  if (points.length > 0) {
    map.fitBounds(points, {
      paddingTopLeft: [80, 120],
      paddingBottomRight: [80, 80]
    });
  }
}

function fitVisibleNetwork() {
  const trainPoints = visibleVehicles().map((vehicle) => [
    vehicle.latitude,
    vehicle.longitude
  ]);
  const stopPoints =
    selectedRouteIds() === null
      ? routes.flatMap((route) =>
          route.stops.map((stop) => [stop.latitude, stop.longitude])
        )
      : routes
          .filter((route) => selectedRouteIds().includes(route.id))
          .flatMap((route) => route.stops.map((stop) => [stop.latitude, stop.longitude]));
  const points = [...trainPoints, ...stopPoints];

  if (points.length > 0) {
    map.fitBounds(points, {
      paddingTopLeft: [70, 120],
      paddingBottomRight: [360, 120],
      maxZoom: 13
    });
  } else {
    map.setView(PHILLY_CENTER, 12);
  }
}

function updateHud(data) {
  feedMode = data.mode || "demo";
  const current = visibleVehicles();
  els.activeCount.textContent = current.length;
  els.updatedAt.textContent = formatClock(data.generatedAt);
  els.feedNote.textContent =
    data.mode === "live"
      ? `Showing ${current.length} trains from live GTFS-Realtime vehicle positions.`
      : "Live vehicle locations for MFL/BSL/NHSL/PATCO are not available in the public feed right now. Counts marked with ~ are display estimates, not live official counts.";
  updateDelayStats();
  applyRealtimeDelaysToVehicles();
  renderLineFilters();
  renderPulsePanel();
}

function renderAlerts(alerts = []) {
  currentAlerts = alerts.filter((alert) =>
    /delay|suspend|cancel|shuttle|equipment|service|detour/i.test(
      `${alert.header} ${alert.description} ${alert.cause} ${alert.effect}`
    )
  );

  if (currentAlerts.length === 0) {
    els.alertBanner.classList.add("hidden");
    els.alertBanner.textContent = "";
    return;
  }

  alertIndex = Math.min(alertIndex, currentAlerts.length - 1);
  const important = currentAlerts[alertIndex];
  els.alertBanner.classList.remove("hidden");
  const message =
    important.description && !important.description.startsWith("http")
      ? important.description
      : important.header;
  els.alertBanner.innerHTML = `
    <button id="alert-prev" type="button" aria-label="Previous alert">‹</button>
    <strong>SEPTA Service Alert</strong>
    <span>${message}</span>
    <em>${alertIndex + 1}/${currentAlerts.length}</em>
    <button id="alert-next" type="button" aria-label="Next alert">›</button>
  `;
  document.querySelector("#alert-prev").addEventListener("click", () => {
    alertIndex = (alertIndex - 1 + currentAlerts.length) % currentAlerts.length;
    renderAlerts(currentAlerts);
  });
  document.querySelector("#alert-next").addEventListener("click", () => {
    alertIndex = (alertIndex + 1) % currentAlerts.length;
    renderAlerts(currentAlerts);
  });
}

function renderReportOptions() {
  els.reportOptions.innerHTML = "";
  els.reportOptions.classList.remove("hidden");
  els.reportDetail.classList.add("hidden");
  pendingReportType = null;
  const target = activeReportTarget();
  reportTypes.forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    const resolvedTarget = reportTargetForType(type);
    const unavailable =
      (type.target === "train" && target.type !== "train") ||
      (type.target === "station" && resolvedTarget.type !== "station");
    button.disabled = unavailable;
    button.className = unavailable ? "disabled" : "";
    button.innerHTML = `<span>${type.icon}</span><strong>${type.label}</strong>`;
    button.addEventListener("click", () => beginReport(type));
    els.reportOptions.append(button);
  });
  updateReportContext();
}

function beginReport(type) {
  const target = reportTargetForType(type);
  if (type.target === "train" && target.type !== "train") return;
  if (type.target === "station" && target.type !== "station") return;

  if (type.id !== "safety") {
    submitReport(type);
    return;
  }

  pendingReportType = type;
  els.reportOptions.classList.add("hidden");
  els.reportDetail.classList.remove("hidden");
  els.reportNote.value = "";
  els.reportNote.focus();
}

function submitReport(type, note = "") {
  const target = reportTargetForType(type);
  if (type.target === "train" && target.type !== "train") return;
  if (type.target === "station" && target.type !== "station") return;

  reports.push({
    id: crypto.randomUUID(),
    type: type.id,
    label: type.label,
    icon: type.icon,
    targetType: target.type,
    targetId: target.id,
    targetLabel: target.label,
    note: note.trim(),
    latitude: target.latitude,
    longitude: target.longitude,
    routeId: target.routeId,
    createdAt: Date.now()
  });
  pruneReports();
  localStorage.setItem("philly-metro-reports", JSON.stringify(reports));
  els.reportPanel.classList.add("hidden");
  renderReports();
  renderPulsePanel();
}

function addMoodReaction(type) {
  const target = activeMoodTarget();
  if (!target) return;

  moodReactions.push({
    id: crypto.randomUUID(),
    emoji: type.emoji,
    label: type.label,
    stationId: target.id,
    stationName: target.stationName || target.label,
    latitude: target.latitude,
    longitude: target.longitude,
    routeId: target.routeId,
    createdAt: Date.now()
  });
  pruneMoodReactions();
  saveLocalState();
  renderMoodMarkers();
  renderPulsePanel();
}

function updateDelayStats() {
  const today = localDateKey();
  if (delayStats.date !== today) {
    delayStats = { date: today, trips: {} };
  }

  vehicles.forEach((vehicle) => {
    const key = vehicle.tripId || vehicle.id;
    const previous = delayStats.trips[key] || { maxDelay: 0, samples: 0 };
    delayStats.trips[key] = {
      ...previous,
      vehicleId: vehicle.id,
      label: vehicle.label,
      routeId: vehicle.routeId,
      routeName: vehicle.routeName,
      routeBadge: vehicle.routeBadge,
      routeColor: vehicle.routeColor,
      destination: vehicle.destination,
      currentStop: vehicle.currentStop,
      nextStop: vehicle.nextStop,
      maxDelay: Math.max(previous.maxDelay, vehicle.delaySeconds || 0),
      latestDelay: vehicle.delaySeconds || 0,
      samples: previous.samples + 1,
      lastSeen: Date.now()
    };
  });

  const sorted = Object.entries(delayStats.trips)
    .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
    .slice(0, 120);
  delayStats.trips = Object.fromEntries(sorted);
  saveLocalState();
}

function applyRealtimeDelaysToVehicles() {
  if (realtimeDelays.length === 0) return;
  const byTrip = new Map(realtimeDelays.map((delay) => [delay.tripId, delay]));
  const byRoute = realtimeDelays.reduce((acc, delay) => {
    const bucket = acc.get(delay.routeId) || [];
    bucket.push(delay);
    acc.set(delay.routeId, bucket);
    return acc;
  }, new Map());

  vehicles = vehicles.map((vehicle, index) => {
    const direct = byTrip.get(vehicle.tripId);
    const routeMatch = byRoute.get(vehicle.routeId)?.[index % byRoute.get(vehicle.routeId).length];
    const delay = direct || routeMatch;
    if (!delay) return vehicle;

    return {
      ...vehicle,
      delaySeconds: delay.latestDelay || delay.maxDelay || vehicle.delaySeconds,
      delaySource: direct ? "GTFS Trip Update" : "route-level GTFS Trip Update"
    };
  });
}

function fallbackDelayEntries() {
  return Object.values(delayStats.trips || {})
    .filter((entry) => entry.maxDelay >= 120)
    .sort((a, b) => b.maxDelay - a.maxDelay)
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      displayLabel: entry.routeName || entry.label,
      status: "estimated",
      sourceLabel: "estimated from current vehicle movement"
    }));
}

function delayDisplayName(entry) {
  if (entry.displayLabel) return entry.displayLabel;
  if (entry.shortLabel && entry.shortLabel.length <= 14) return entry.shortLabel;
  return entry.routeName ? `${entry.routeName} trip` : "Delayed trip";
}

function renderMoodBoard() {
  pruneMoodReactions();
  els.moodActions.innerHTML = "";
  els.moodPicker.innerHTML = "";
  const target = activeMoodTarget();
  els.moodTarget.textContent = target
    ? target.stationName || target.label
    : "Select a station";

  const activeMoodTypes = [
    ...defaultMoodTypes,
    ...customMoodTypes.filter(
      (custom) => !defaultMoodTypes.some((type) => type.emoji === custom.emoji)
    )
  ].slice(0, 9);

  activeMoodTypes.forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = !target;
    button.title = type.label;
    const count = target
      ? moodReactions.filter(
          (reaction) => reaction.stationId === target.id && reaction.emoji === type.emoji
        ).length
      : 0;
    button.innerHTML = `<span>${type.emoji}</span><small>${count || ""}</small>`;
    button.addEventListener("click", () => addMoodReaction(type));
    els.moodActions.append(button);
  });

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "mood-add";
  addButton.title = "Add more mood reactions";
  addButton.innerHTML = `<span>+</span><small></small>`;
  addButton.addEventListener("click", () => {
    els.moodPicker.classList.toggle("hidden");
  });
  els.moodActions.append(addButton);

  const availableMoods = moodLibrary.filter(
    (candidate) => !activeMoodTypes.some((type) => type.emoji === candidate.emoji)
  );
  els.moodPicker.innerHTML =
    availableMoods.length === 0
      ? `<p>All popular moods added.</p>`
      : availableMoods
          .map(
            (type) => `
              <button type="button" data-emoji="${type.emoji}" title="${escapeAttribute(type.label)}">
                <span>${type.emoji}</span>
                <strong>${type.label}</strong>
              </button>
            `
          )
          .join("");
  els.moodPicker.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const type = moodLibrary.find((candidate) => candidate.emoji === button.dataset.emoji);
      if (!type) return;
      customMoodTypes = [...customMoodTypes, type].slice(-8);
      els.moodPicker.classList.add("hidden");
      saveLocalState();
      renderMoodBoard();
    });
  });

  const grouped = moodReactions.reduce((acc, reaction) => {
    const key = `${reaction.stationId}:${reaction.emoji}`;
    const current = acc.get(key) || { ...reaction, count: 0 };
    current.count += 1;
    acc.set(key, current);
    return acc;
  }, new Map());
  const topMoods = [...grouped.values()]
    .sort((a, b) => b.count - a.count || b.createdAt - a.createdAt)
    .slice(0, 4);

  els.moodFeed.innerHTML =
    topMoods.length === 0
      ? `<p>No station moods yet.</p>`
      : topMoods
          .map(
            (reaction) => `
              <button type="button" data-station-id="${escapeAttribute(reaction.stationId)}">
                <span>${reaction.emoji}</span>
                <strong>${reaction.stationName}</strong>
                <em>${reaction.count}</em>
              </button>
            `
          )
          .join("");

  els.moodFeed.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const reaction = moodReactions.find(
        (candidate) => candidate.stationId === button.dataset.stationId
      );
      if (reaction) map.flyTo([reaction.latitude, reaction.longitude], 15, { duration: 0.7 });
    });
  });
}

function renderDelayLeaderboard() {
  const hasRealtime = realtimeDelays.length > 0;
  const entries = hasRealtime
    ? realtimeDelays.slice(0, 5).map((entry) => ({
        ...entry,
        sourceLabel: entry.status === "canceled" ? "official cancellation" : "official GTFS trip delay"
      }))
    : fallbackDelayEntries();

  els.delaySource.textContent = hasRealtime
    ? `GTFS ${delayFeedAt ? formatClock(delayFeedAt) : "live"}`
    : delayFeedError
      ? "feed unavailable"
      : "watching";

  els.delayBoard.innerHTML =
    entries.length === 0
      ? `<li class="empty-row">${delayFeedError ? "Could not reach realtime trip updates." : "No official tracked delays right now."}</li>`
      : entries
          .map(
            (entry, index) => `
              <li class="${entry.status === "canceled" ? "canceled" : ""}">
                <span class="rank">${index + 1}</span>
                <span class="mini-line" style="background:${entry.routeColor}">${entry.routeBadge}</span>
                <button type="button" data-vehicle-id="${escapeAttribute(entry.vehicleId || "")}" data-route-id="${escapeAttribute(entry.routeId)}">
                  <strong>${delayDisplayName(entry)}</strong>
                  <small>${entry.status === "canceled" ? "Canceled" : entry.sourceLabel} · ${entry.destination || entry.routeName}</small>
                </button>
                <em>${entry.status === "canceled" ? "CNX" : formatMinutes(entry.maxDelay)}</em>
              </li>
            `
          )
          .join("");

  els.delayBoard.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const vehicle = vehicles.find(
        (candidate) =>
          candidate.id === button.dataset.vehicleId ||
          candidate.tripId === button.dataset.vehicleId
      );
      if (vehicle) {
        selectVehicle(vehicle.id, true);
      } else {
        selectRoute(button.dataset.routeId);
      }
    });
  });
}

function forecastScore(routeIds, baseScore) {
  const reportBoost = reports.filter(
    (report) =>
      routeIds.includes(report.routeId) &&
      ["crowded-car", "door-holding", "platform-flow"].includes(report.type)
  ).length;
  const busyVehicles = vehicles.filter(
    (vehicle) =>
      routeIds.includes(vehicle.routeId) &&
      ["FEW_SEATS_AVAILABLE", "STANDING_ROOM_ONLY", "CRUSHED_STANDING_ROOM_ONLY"].includes(
        vehicle.occupancy
      )
  ).length;
  const alertBoost = currentAlerts.filter((alert) =>
    alert.routes?.some((routeId) => routeIds.includes(routeId))
  ).length;
  const delayBoost = realtimeDelays.filter((delay) => routeIds.includes(delay.routeId)).length;
  return clamp(baseScore + reportBoost * 8 + busyVehicles * 2 + alertBoost * 5 + delayBoost * 3, 4, 98);
}

function renderSurgeForecast() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const weekday = day >= 1 && day <= 5;
  const commuteIn = weekday && hour >= 6 && hour < 10;
  const commuteOut = weekday && hour >= 15 && hour < 19;
  const lunch = weekday && hour >= 11 && hour < 14;
  const nightEvent = hour >= 17 && hour <= 23;
  const nextStart = clamp(hour + 1, 5, 23);
  const nextEnd = clamp(nextStart + 2, 6, 24);
  els.surgeWindow.textContent = `${fullDateLabel(now)} · ${timeRangeLabel(nextStart, nextEnd)}`;

  const historic = {
    L: commuteIn || commuteOut ? 74 : lunch ? 54 : 42,
    BSL: commuteIn || commuteOut ? 68 : nightEvent ? 78 : 38,
    TROLLEY: commuteIn || commuteOut ? 64 : lunch ? 47 : 35,
    REGIONAL: commuteOut ? 76 : commuteIn ? 71 : 40,
    PATCO: commuteIn || commuteOut ? 58 : nightEvent ? 49 : 31,
    NHSL: commuteIn || commuteOut ? 51 : 27
  };

  const candidates = [
    {
      title: "Broad Street Line southbound",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · commute + stadium weighting`,
      routeIds: ["B1", "B2"],
      base: historic.BSL
    },
    {
      title: commuteOut ? "Market-Frankford Line westbound" : "Market-Frankford Line eastbound",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · historic MFL load`,
      routeIds: ["L"],
      base: historic.L
    },
    {
      title: "Trolley tunnel westbound",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · tunnel peak pattern`,
      routeIds: routeGroups.TROLLEY.ids,
      base: historic.TROLLEY
    },
    {
      title: "Regional Rail Center City",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · Center City peak`,
      routeIds: routeGroups.REGIONAL.ids,
      base: historic.REGIONAL
    },
    {
      title: "PATCO westbound",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · bridge commuter flow`,
      routeIds: ["P"],
      base: historic.PATCO
    },
    {
      title: "Norristown High Speed Line",
      meta: `${timeRangeLabel(nextStart, nextEnd)} · suburban peak`,
      routeIds: ["M"],
      base: historic.NHSL
    }
  ];

  const forecasts = candidates
    .map((candidate) => ({
      ...candidate,
      score: forecastScore(candidate.routeIds, candidate.base)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  els.surgeList.innerHTML = forecasts
    .map((forecast) => {
      const level = forecast.score >= 75 ? "high" : forecast.score >= 55 ? "medium" : "low";
      return `
        <button type="button" data-route-id="${forecast.routeIds[0]}" class="${level}">
          <span>${forecast.score}%</span>
          <strong>${forecast.title}</strong>
          <small>${forecast.meta}</small>
        </button>
      `;
    })
    .join("");

  els.surgeList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectRoute(button.dataset.routeId));
  });
}

function computeStreak() {
  const dates = new Set(tripLogs.map((trip) => localDateKey(trip.createdAt)));
  if (dates.size === 0) return 0;

  let startOffset = dates.has(subtractDaysKey(0)) ? 0 : dates.has(subtractDaysKey(1)) ? 1 : 0;
  let streak = 0;
  while (dates.has(subtractDaysKey(startOffset + streak))) {
    streak += 1;
  }
  return streak;
}

function selectedVehicle() {
  return vehicles.find((candidate) => candidate.id === selectedVehicleId);
}

function tripLogOptions(vehicle) {
  const route = getRoute(vehicle.routeId);
  if (!route) return [];
  const boardIndex = stopIndexForVehicle(route, vehicle);
  const step = tripDirectionStep(vehicle);
  const options = [];
  for (
    let index = boardIndex + step;
    index >= 0 && index < route.stops.length;
    index += step
  ) {
    const stop = route.stops[index];
    const miles = segmentMiles(route.id, boardIndex, index);
    options.push({
      index,
      name: stop.name,
      miles
    });
  }
  return options;
}

function updateTripDistancePreview() {
  const vehicle = selectedVehicle();
  if (!vehicle) return;
  const route = getRoute(vehicle.routeId);
  const boardIndex = stopIndexForVehicle(route, vehicle);
  const alightIndex = Number(els.tripAlightStop.value);
  const miles = segmentMiles(vehicle.routeId, boardIndex, alightIndex);
  const stops = Math.abs(alightIndex - boardIndex);
  els.tripDistancePreview.textContent = `${stops} stop${stops === 1 ? "" : "s"} · ${miles.toFixed(2)} miles`;
}

function openTripLogForm() {
  const vehicle = vehicles.find((candidate) => candidate.id === selectedVehicleId);
  if (!vehicle) return;
  const route = getRoute(vehicle.routeId);
  if (!route) return;
  const boardIndex = stopIndexForVehicle(route, vehicle);
  const boardStop = route.stops[boardIndex]?.name || vehicle.currentStop;
  const options = tripLogOptions(vehicle);

  els.tripBoardStop.textContent = boardStop;
  els.tripAlightStop.innerHTML = options
    .map(
      (option) =>
        `<option value="${option.index}">${option.name} · ${option.miles.toFixed(2)} mi</option>`
    )
    .join("");
  els.tripLogForm.classList.remove("hidden");
  updateTripDistancePreview();
}

function logSelectedTrip(event) {
  event?.preventDefault();
  const vehicle = selectedVehicle();
  if (!vehicle) return;
  const route = getRoute(vehicle.routeId);
  if (!route) return;
  const boardIndex = stopIndexForVehicle(route, vehicle);
  const alightIndex = Number(els.tripAlightStop.value);
  const boardStop = route.stops[boardIndex]?.name || vehicle.currentStop;
  const alightStop = route.stops[alightIndex]?.name || vehicle.nextStop;
  const miles = segmentMiles(vehicle.routeId, boardIndex, alightIndex);
  if (!Number.isFinite(miles) || miles <= 0) return;

  const recentDuplicate = tripLogs.some(
    (trip) =>
      trip.vehicleId === vehicle.id &&
      trip.from === boardStop &&
      trip.to === alightStop &&
      Date.now() - trip.createdAt < 5 * 60 * 1000
  );
  if (recentDuplicate) return;

  tripLogs.unshift({
    id: crypto.randomUUID(),
    vehicleId: vehicle.id,
    label: vehicle.label,
    routeId: vehicle.routeId,
    routeName: vehicle.routeName,
    routeBadge: vehicle.routeBadge,
    from: boardStop,
    to: alightStop,
    miles,
    createdAt: Date.now()
  });
  tripLogs = tripLogs.slice(0, 400);
  saveLocalState();
  renderPulsePanel();
  els.tripLogForm.classList.add("hidden");

  els.logTrip.textContent = "Saved";
  setTimeout(() => {
    els.logTrip.textContent = "Log";
  }, 1200);
}

function renderPersonalTransit() {
  const totalMiles = tripLogs.reduce((sum, trip) => sum + (trip.miles || 0), 0);
  const byRoute = tripLogs.reduce((acc, trip) => {
    const current = acc.get(trip.routeId) || { count: 0, badge: trip.routeBadge, name: trip.routeName };
    current.count += 1;
    acc.set(trip.routeId, current);
    return acc;
  }, new Map());
  const favorite = [...byRoute.values()].sort((a, b) => b.count - a.count)[0];
  const streak = computeStreak();
  const firstTrip = tripLogs.at(-1);
  const lastTrip = tripLogs[0];
  const badge =
    streak >= 30 ? "30 day badge" : streak >= 14 ? "14 day badge" : streak >= 7 ? "7 day badge" : `${streak} day streak`;

  els.streakBadge.textContent = badge;
  els.tripCount.textContent = tripLogs.length;
  els.tripMiles.textContent = Math.round(totalMiles);
  els.favoriteLine.textContent = favorite?.badge || "--";
  els.wrappedCard.innerHTML =
    tripLogs.length === 0
      ? `<p>No trips logged yet.</p>`
      : `
        <strong>${lastTrip.routeName}</strong>
        <span>${lastTrip.from} → ${lastTrip.to}</span>
        <small>First logged: ${firstTrip ? formatClock(firstTrip.createdAt) : "--"}</small>
      `;
}

function renderPulsePanel() {
  els.pulseTitle.textContent =
    selectedRouteId === "ALL"
      ? "Philly network"
      : routeGroups[selectedRouteId]?.label || getRoute(selectedRouteId)?.name || "Selected route";
  els.pulseUpdated.textContent = formatClock(Date.now());
  renderMoodBoard();
  renderDelayLeaderboard();
  renderSurgeForecast();
  renderPersonalTransit();
}

async function loadRoutes() {
  const response = await fetch("/api/routes");
  const data = await response.json();
  routes = data.routes;
  renderLineFilters();
  drawRoutes();
  fitVisibleNetwork();
}

async function refreshAlerts() {
  try {
    const response = await fetch("/api/alerts");
    const data = await response.json();
    renderAlerts(data.alerts || []);
    renderPulsePanel();
  } catch {
    renderAlerts([]);
  }
}

async function refreshDelays() {
  try {
    const response = await fetch("/api/delays");
    const data = await response.json();
    realtimeDelays = (data.delays || [])
      .filter((delay) => delay.maxDelay >= 60 || delay.status === "canceled")
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "canceled" ? -1 : 1;
        return b.maxDelay - a.maxDelay;
      });
    delayFeedAt = data.generatedAt || Date.now();
    delayFeedError = data.error || null;
    applyRealtimeDelaysToVehicles();
    renderPulsePanel();
    renderGhosts();
  } catch (error) {
    realtimeDelays = [];
    delayFeedError = error.message;
    renderPulsePanel();
  }
}

async function refreshVehicles() {
  els.refresh.disabled = true;

  try {
    const response = await fetch("/api/vehicles");
    const data = await response.json();
    vehicles = data.vehicles || [];

    if (selectedVehicleId && !vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      selectedVehicleId = null;
      rideAlong = false;
    }

    updateHud(data);
    renderDynamicLayers();
    const selected = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    updateTrainCard(selected);

    if (rideAlong && selected) {
      map.panTo([selected.latitude, selected.longitude], { animate: true });
    }
  } catch (error) {
    els.feedNote.textContent = `Could not load SEPTA data: ${error.message}`;
  } finally {
    els.refresh.disabled = false;
  }
}

function setTheme(nextTheme) {
  if (baseLayer) map.removeLayer(baseLayer);
  theme = nextTheme;
  baseMapReady = false;
  baseLayer = createBaseLayer(theme);
  baseLayer.addTo(map);
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("philly-metro-theme", theme);
  refreshMapLayers();
  configureVectorBuildings();
}

els.refresh.addEventListener("click", () => {
  refreshVehicles();
  refreshAlerts();
  refreshDelays();
});
els.locate.addEventListener("click", () => {
  map.flyTo(PHILLY_CENTER, 12, { duration: 0.8 });
});
els.buildingsToggle.addEventListener("click", () => {
  setBuildingsEnabled(!buildingsEnabled);
});
els.themeToggle.addEventListener("click", () => {
  setTheme(theme === "dark" ? "light" : "dark");
});
els.reportOpen.addEventListener("click", () => {
  renderReportOptions();
  els.reportPanel.classList.toggle("hidden");
});
els.reportClose.addEventListener("click", () => {
  els.reportPanel.classList.add("hidden");
});
els.reportBack.addEventListener("click", () => {
  renderReportOptions();
});
els.reportDetail.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pendingReportType) {
    submitReport(pendingReportType, els.reportNote.value);
  }
});
els.zoomIn.addEventListener("click", () => map.zoomIn());
els.zoomOut.addEventListener("click", () => map.zoomOut());
els.rideAlong.addEventListener("click", () => {
  rideAlong = !rideAlong;
  els.rideAlong.classList.toggle("active", rideAlong);
  const vehicle = vehicles.find((candidate) => candidate.id === selectedVehicleId);
  if (rideAlong && vehicle) {
    map.flyTo([vehicle.latitude, vehicle.longitude], Math.max(map.getZoom(), 16), {
      duration: 0.8
    });
  }
});
els.logTrip.addEventListener("click", openTripLogForm);
els.tripAlightStop.addEventListener("change", updateTripDistancePreview);
els.tripLogForm.addEventListener("submit", logSelectedTrip);
els.tripLogCancel.addEventListener("click", () => {
  els.tripLogForm.classList.add("hidden");
});

await loadRoutes();
renderReportOptions();
renderPulsePanel();
setBuildingsEnabled(buildingsEnabled);
await refreshVehicles();
await refreshDelays();
await refreshAlerts();
requestAnimationFrame(() => {
  map.invalidateSize();
  fitVisibleNetwork();
  refreshMapLayers();
});
setInterval(refreshVehicles, REFRESH_MS);
setInterval(refreshDelays, DELAY_REFRESH_MS);
setInterval(refreshAlerts, 60000);
