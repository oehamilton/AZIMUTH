# AZIMUTH data schema

Single JSON file for all persisted app data. Optional user-chosen path (e.g. OneDrive folder); default location is app data directory.

## Schema version

- Current: `1`. Always include `schemaVersion` for future migrations.

## Root shape

```json
{
  "schemaVersion": 1,
  "homes": [],
  "targets": [],
  "preferences": {}
}
```

## Saved home

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique id (e.g. UUID). |
| `name` | string | yes | Display name (e.g. "Shack", "Portable"). |
| `lat` | number | yes | Latitude, decimal degrees (WGS84). |
| `lon` | number | yes | Longitude, decimal degrees (WGS84). |
| `magneticDeclination` | number | no | Degrees (+E / −W convention). |
| `notes` | string | no | Optional notes. |

**Default home when none exist:** Washington DC, White House — `lat: 38.8977`, `lon: -77.0365`.

## Saved target

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique id (e.g. UUID). |
| `name` | string | yes | Display name. |
| `lat` | number | yes | Latitude, decimal degrees (WGS84). |
| `lon` | number | yes | Longitude, decimal degrees (WGS84). |
| `notes` | string | no | Optional notes. |

## Preferences

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `distanceUnit` | `"km"` \| `"nm"` \| `"miles"` | `"km"` | User-selected distance unit. |
| `dataFilePath` | string \| null | null | Optional user-chosen path for this JSON file (e.g. OneDrive). |

## File location

- **Default:** App data directory (e.g. Electron `app.getPath('userData')` / Windows `%APPDATA%/azimuth`).
- **Override:** If `preferences.dataFilePath` is set, read/write the JSON file at that path instead.
