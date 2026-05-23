# SeptaScope

A starter project for a live SEPTA rail tracker inspired by the NYC subway live map style: active trains, route colors, destinations, service alerts, mood reactions, and surge/delay signals.

## What this starter does

- Runs with plain Node.js, no package install required.
- Serves a browser UI at `http://localhost:5173`.
- Proxies SEPTA's public GTFS-Realtime vehicle-position pretty-print endpoint through `/api/vehicles`.
- Proxies SEPTA Trip Updates through `/api/delays` for official current delay and cancellation rows where the feed exposes them.
- Tracks SEPTA Metro `L`, `B1`, `B2`, `B3`, and `M` lines, with aliases for MFL, BSL, NHSL, and Route 100.
- Includes prototype overlays for PATCO, SEPTA trolley routes, and regional rail lines so the network can read like the full rail-transit map.
- Uses peak-style demo density while SEPTA Metro vehicle positions are unavailable: 16 L trains, 17 Broad Street branch trains, plus trolley, PATCO, and regional rail samples.
- Uses OpenFreeMap/OpenMapTiles through MapLibre for the base map, with a smooth vector building-detail toggle and a CARTO fallback if MapLibre cannot load.
- Shows clickable train markers, a train detail card, route filters, and a Ride Along mode.
- Adds train-shaped markers, ghost scheduled positions, delay gap lines, station pulse rings, a POV ride mode, and dark/light map themes.
- Adds a local Waze-style community reporting layer for delay, crowding, hazard, equipment, accessibility, and cleanliness reports.
- Organizes controls into primary rail buttons plus dropdowns with full route names, station labels on selected routes, an alert carousel, and a clearer scheduled-vs-actual legend.
- Train counts on MFL, BSL, PATCO, and NHSL show live counts only when official live vehicle data is present; otherwise they are prefixed with `~` and treated as display estimates.
- Surfaces public SEPTA service alerts through `/api/alerts` when the feed reports service disruptions.
- Falls back to explicit `DEMO` train movement when the public GTFS-RT snapshot has no Metro vehicles, so interaction work can continue honestly.

## Run it

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Data sources

SEPTA publishes static GTFS files and GTFS-Realtime feeds. The production version of this project should consume:

- Static GTFS: routes, stops, stop times, trips, and shapes.
- GTFS-RT Vehicle Positions: live vehicle latitude, longitude, route, trip, stop, bearing, and timestamp.
- GTFS-RT Trip Updates: destination and arrival predictions when vehicle positions are incomplete.
- GTFS-RT Service Alerts: disruptions and station or line advisories.

This starter uses the human-readable `print.php` endpoint so you can get moving without protobuf dependencies. The next real upgrade is to install `gtfs-realtime-bindings` and parse the `.pb` feed directly.

## Recommended architecture

```text
SEPTA GTFS static zip
        |
        v
  ingest script  --->  Postgres/PostGIS or SQLite cache
        |
        v
route shapes, stops, trips, terminals

SEPTA GTFS-RT .pb feeds
        |
        v
polling worker every 10-20 seconds
        |
        v
normalize vehicles + trip updates + alerts
        |
        v
API / WebSocket / Server-Sent Events
        |
        v
map UI + line dashboard
```

## Suggested next milestones

1. Replace the `print.php` parser with protobuf parsing from the `.pb` endpoint.
2. Download and cache SEPTA static GTFS so route IDs, station names, destinations, and shapes come from real data.
3. Replace the hardcoded station paths with `shapes.txt` polylines.
4. If you want deeper 3D later, move the entire renderer to MapLibre/deck.gl so train lines, markers, and buildings all share the same pitched camera.
5. Add historical snapshots so you can replay service and compute headways.
# SeptaScope
