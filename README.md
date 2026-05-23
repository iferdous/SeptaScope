Demo Video : https://drive.google.com/file/d/1xOSEvGoM0zrWsq39cwF4XI2T7mvwLP_l/view?usp=sharing




# SeptaScope

SeptaScope is an interactive SEPTA rail visualization prototype for watching the Philadelphia rail network like a live operations map. It shows trains, routes, stations, alerts, delay signals, rider reports, mood reactions, trip logs, and surge forecasts in one map-first interface.

The goal is to feel closer to a transit-aware Waze than a static schedule page: users can click trains, inspect what is happening, report issues, log trips, and see the system’s current pulse.

## Run Locally

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

This project runs with plain Node.js and browser-side JavaScript. There is no build step.

## What It Uses

### SEPTA GTFS-Realtime Vehicle Positions

Endpoint used by the backend:

```text
https://www3.septa.org/gtfsrt/septa-pa-us/Vehicle/print.php
```

Exposed locally through:

```text
/api/vehicles
```

SeptaScope parses vehicle position snapshots for route IDs, trip IDs, vehicle labels, coordinates, bearing, timestamps, occupancy status, and stop context when present.

In the app, this powers:

- Train markers on the map.
- Active train counts.
- Route badges and colors.
- Current stop and next stop estimates.
- Destination labels.
- Train detail cards.
- Ride-along tracking.
- Scheduled-vs-actual “ghost train” visuals.

Important limitation: SEPTA’s public realtime vehicle feed does not consistently expose every metro-style route in a way that covers the full MFL, BSL, NHSL, PATCO, trolley, and regional rail experience. When matching live positions are missing, SeptaScope uses a clearly marked simulated movement layer so the interface can still be developed and tested.

### SEPTA GTFS-Realtime Trip Updates

Endpoints used by the backend:

```text
https://www3.septa.org/gtfsrt/septa-pa-us/Trip/print.php
https://www3.septa.org/gtfsrt/septarail-pa-us/Trip/print.php
```

Exposed locally through:

```text
/api/delays
```

SeptaScope parses trip updates for route IDs, trip IDs, direction, schedule relationship, stop-time delays, and cancellations.

In the app, this powers:

- Frequent Delays leaderboard.
- Official delay minutes where the feed exposes them.
- Canceled trip rows.
- Delay-aware surge scoring.
- Route-level delay hints when exact vehicle-to-trip matching is unavailable.

The leaderboard avoids showing raw rail consist IDs like `856,855,716` as the main user-facing label. Those values are useful internally, but the UI displays cleaner labels such as the route name or short trip code.

### SEPTA Service Alerts

Endpoint used by the backend:

```text
https://www3.septa.org/gtfsrt/septa-pa-us/Service/print.php
```

Exposed locally through:

```text
/api/alerts
```

SeptaScope filters service alerts for disruptions such as delays, suspensions, detours, equipment issues, shuttle service, and cancellations.

In the app, this powers:

- The SEPTA Service Alert banner.
- Alert carousel arrows.
- Surge forecast boosts when a route has active service issues.
- User-facing disclaimers before riders inspect the map.

### OpenFreeMap / OpenMapTiles

Map stack:

```text
https://tiles.openfreemap.org/styles/dark
https://tiles.openfreemap.org/styles/liberty
https://tiles.openfreemap.org/planet
```

SeptaScope uses OpenFreeMap and OpenMapTiles through MapLibre, with Leaflet still handling the interactive train, route, station, report, and mood layers.

In the app, this powers:

- Dark and light map modes.
- Real geographic streets, labels, water, parks, and neighborhoods.
- A smoother vector-map base than raster-only tiles.
- Optional vector building detail through MapLibre’s building layer.

The previous experimental Overpass building-footprint scraper was removed because it looked choppy and was too heavy. The current map uses OpenFreeMap/OpenMapTiles instead, matching the open-source map stack shown in the inspiration reference.

## Prototype Route Data

The route and stop geometry currently lives in `server.js`.

Included route families:

- Market-Frankford Line.
- Broad Street Line local, express, and Broad-Ridge Spur.
- Norristown High Speed Line.
- PATCO Line.
- SEPTA trolley routes.
- SEPTA regional rail lines.

These routes are hardcoded enough to build the user experience quickly. A production version should ingest SEPTA static GTFS files for official `routes.txt`, `trips.txt`, `stops.txt`, `stop_times.txt`, and `shapes.txt`.

## User Feedback Layer

SeptaScope includes Waze-style user feedback, stored locally in the browser for now.

### Community Reports

Stored in:

```text
localStorage["philly-metro-reports"]
```

Reports can attach to a train ID or station. They expire after about 20 minutes.

Supported report types:

- Door holding.
- Overcrowded car.
- Broken AC or heat.
- Sketchy situation with a typed note.
- Elevator or escalator down.
- Platform blocked.
- Fare gate broken.

In the app, reports appear as map pins and also influence surge scoring.

### Mood Board

Stored in:

```text
localStorage["philly-metro-moods"]
localStorage["septascope-custom-moods"]
```

The Mood Board is intentionally lighter than reports. It is for station vibes, not operational incidents.

Examples:

- Music or good busker.
- Flooding.
- Platform heat.
- Clean station.
- Slow crawl.
- Calm platform.

Users can add more popular mood emojis with the `+` mood picker. Mood reactions expire after several hours and appear as small station-level markers.

### Personal Trip Logging

Stored in:

```text
localStorage["philly-metro-trip-logs"]
```

Trip logging is station-to-station. The app does not assume the rider stayed on until the train’s terminal.

When logging a trip:

1. The current or nearest station is treated as the boarding station.
2. The user picks the station they got off at.
3. Miles are calculated along that route segment only.
4. The trip contributes to personal stats.

This powers:

- Trip count.
- Estimated miles ridden.
- Most-ridden line.
- Transit streak.
- A small personal history card.

## Surge Forecasting

Surge forecasting is currently heuristic, not a trained model.

Inputs used:

- Time of day.
- Day of week.
- Peak commute windows.
- Stadium/event-style weighting for Broad Street Line.
- Active service alerts.
- Active crowding or door-holding reports.
- Occupancy values when present in the vehicle feed.
- Current trip delays from GTFS-Realtime Trip Updates.

The output is a practical near-term crowding score for the next 30-60 minute window. It is meant to communicate “where pressure is likely building,” not a guaranteed ridership count.

Production upgrade path:

- Store historical vehicle snapshots.
- Store trip update delay history.
- Ingest SEPTA ridership datasets if available.
- Add city event feeds for sports, concerts, closures, and weather.
- Train a route/time/event demand model.

## Frontend Features

Current UI includes:

- Clickable train markers.
- Train detail card.
- Route filter chips and dropdowns.
- Station labels when a route is selected.
- Service alert carousel.
- Dark/light mode.
- OpenFreeMap/OpenMapTiles map base.
- Optional vector building detail.
- Scheduled-vs-actual ghost train visualization.
- Station pulse rings when trains approach.
- Community report modal.
- Mood Board.
- Frequent Delays leaderboard.
- Surge Forecast panel.
- Personal trip history and streaks.

## Backend Endpoints

The local Node server exposes:

```text
GET /api/routes
GET /api/vehicles
GET /api/delays
GET /api/alerts
```

It also serves the static frontend from:

```text
public/
```

## What Is Live vs Simulated

Live or external:

- SEPTA Vehicle Positions when matching route data is available.
- SEPTA Trip Updates.
- SEPTA Service Alerts.
- OpenFreeMap/OpenMapTiles vector map data.



