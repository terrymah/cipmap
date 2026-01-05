# Hex Location Format Documentation

This document describes the custom hexagonal grid system used for user location privacy in the CIP Map application.

## Overview

Users select their approximate location by clicking on a hexagonal cell rather than providing exact coordinates. This provides location-based features while preserving privacy.

## Hex ID Format

Hex IDs follow the pattern: `hex_{row}_{col}`

Examples:
- `hex_0_0` - Center hex
- `hex_-2_3` - 2 rows above center, 3 columns right
- `hex_4_-1` - 4 rows below center, 1 column left

## Grid Configuration

The hex grid is configured in `config.json` under `userLocationPicker`:

```json
{
  "userLocationPicker": {
    "center": { "lat": 35.7327, "lng": -78.8503 },
    "zoom": 11,
    "hexSize": 0.008,
    "gridCols": 11,
    "gridRows": 9
  }
}
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `center` | Center point of the grid (lat/lng) | Uses `mapCenter` from config |
| `zoom` | Map zoom level for the picker | 11 |
| `hexSize` | Size of hexagons in degrees | 0.008 (~0.9km edge at 35.7°N) |
| `gridCols` | Number of columns in the grid | 11 |
| `gridRows` | Number of rows in the grid | 9 |

## Hexagon Geometry

The grid uses **pointy-top hexagons** (vertices pointing up and down).

### Spacing Formulas

```
Longitude correction = 1.0 / cos(centerLat * π / 180)
Vertical spacing = hexSize * 1.5
Horizontal spacing = hexSize * sqrt(3) * longitudeCorrection
```

### Row Offset

Odd rows are offset horizontally by half the horizontal spacing to create the honeycomb pattern.

## API Data Structure

When users register, the hex location is sent to the API:

```json
POST /api/users
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "hex_location": "hex_-2_3",
  "appid": "2026survey"
}
```

## Converting Hex ID to Coordinates

To convert a hex ID back to geographic coordinates:

```javascript
function hexIdToCenter(hexId, config) {
    // Parse "hex_{row}_{col}"
    const parts = hexId.split('_');
    const row = parseInt(parts[1]);
    const col = parseInt(parts[2]);
    
    const { center, hexSize } = config.userLocationPicker;
    const lngCorrection = 1.0 / Math.cos(center.lat * Math.PI / 180);
    
    const vertSpacing = hexSize * 1.5;
    const horizSpacing = hexSize * Math.sqrt(3) * lngCorrection;
    const xOffset = (Math.abs(row) % 2 === 1) ? horizSpacing / 2 : 0;
    
    return {
        lat: center.lat + (row * vertSpacing),
        lng: center.lng + (col * horizSpacing) + xOffset
    };
}
```

## Generating Hex Boundary Points

To draw the hexagon polygon:

```javascript
function generateHexPoints(centerLat, centerLng, size, lngCorrection) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        // Pointy-top: start at 90° (point up), go clockwise
        const angleDeg = 60 * i + 90;
        const angleRad = (Math.PI / 180) * angleDeg;
        points.push([
            centerLat + size * Math.sin(angleRad),
            centerLng + size * Math.cos(angleRad) * lngCorrection
        ]);
    }
    return points;
}
```

## Regenerating the Full Grid

To regenerate the complete grid (e.g., for displaying user counts):

```javascript
function generateHexGrid(centerLat, centerLng, hexSize, cols, rows) {
    const hexagons = [];
    const lngCorrection = 1.0 / Math.cos(centerLat * Math.PI / 180);
    const vertSpacing = hexSize * 1.5;
    const horizSpacing = hexSize * Math.sqrt(3) * lngCorrection;
    
    for (let row = -Math.floor(rows/2); row <= Math.floor(rows/2); row++) {
        for (let col = -Math.floor(cols/2); col <= Math.floor(cols/2); col++) {
            const xOffset = (Math.abs(row) % 2 === 1) ? horizSpacing / 2 : 0;
            
            hexagons.push({
                id: `hex_${row}_${col}`,
                center: {
                    lat: centerLat + (row * vertSpacing),
                    lng: centerLng + (col * horizSpacing) + xOffset
                }
            });
        }
    }
    return hexagons;
}
```

## Displaying User Counts on a Map

To show aggregated user locations:

```javascript
function drawUserHexes(map, userCounts, config) {
    const picker = config.userLocationPicker;
    const hexagons = generateHexGrid(
        picker.center.lat,
        picker.center.lng,
        picker.hexSize,
        picker.gridCols,
        picker.gridRows
    );
    
    const lngCorrection = 1.0 / Math.cos(picker.center.lat * Math.PI / 180);
    
    hexagons.forEach(hex => {
        const count = userCounts[hex.id] || 0;
        if (count > 0) {
            const points = generateHexPoints(
                hex.center.lat, 
                hex.center.lng, 
                picker.hexSize, 
                lngCorrection
            );
            
            L.polygon(points, {
                color: '#27ae60',
                weight: 2,
                fillColor: '#27ae60',
                fillOpacity: Math.min(0.2 + count * 0.1, 0.8)
            })
            .bindPopup(`${count} users in this area`)
            .addTo(map);
        }
    });
}
```

## Notes

- This is a custom implementation, NOT Uber's H3 library
- The grid is fixed and deterministic based on configuration
- Hex IDs are stable as long as the config doesn't change
- The longitude correction factor accounts for the Earth's curvature at the given latitude
