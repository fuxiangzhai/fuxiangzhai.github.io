function isCityCandidate([lon, lat]) {
  // Coordinates rounded to a tenth of a degree often come from a regional IP lookup.
  const hasDetail = value => Math.abs(value * 10 - Math.round(value * 10)) > 1e-6;
  return hasDetail(lon) || hasDetail(lat);
}

function containsPoint(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [previousX, previousY] = ring[j];
    if ((y > lat) !== (previousY > lat) && lon < x + (previousX - x) * (lat - y) / (previousY - y)) {
      inside = !inside;
    }
  }
  return inside;
}

function regionAt(regions, lon, lat) {
  return regions.find(([, , [west, south, east, north], [outer, ...holes]]) =>
    lon >= west && lon <= east && lat >= south && lat <= north
    && containsPoint(outer, lon, lat)
    && !holes.some(hole => containsPoint(hole, lon, lat)));
}

function nearbyCity(cities, lon, lat, regionCode) {
  // A local distance approximation is sufficient within eight kilometers.
  const longitudeScale = Math.cos(lat * Math.PI / 180);
  let nearest;
  let bestDistance = 8 / 111;
  for (const city of cities) {
    const [, cityLon, cityLat, country, sovereign] = city;
    if (regionCode && country !== regionCode && sovereign !== regionCode) continue;
    const latDifference = cityLat - lat;
    if (Math.abs(latDifference) > bestDistance) continue;
    const lonDifference = ((cityLon - lon + 540) % 360) - 180;
    const distance = Math.hypot(lonDifference * longitudeScale, latDifference);
    if (distance >= bestDistance) continue;
    nearest = city;
    bestDistance = distance;
  }
  return nearest;
}

async function fetchPlaces(kind) {
  try {
    const response = await fetch(`/assets/visitor-map/visitor-${kind}.json`);
    if (response.ok) {
      const places = (await response.json())[kind];
      if (Array.isArray(places)) return places;
    }
  } catch {
    // The reported coordinates are still available if the place catalog is unreachable.
  }
  return [];
}

export async function identifyVisitorPlaces(points) {
  const [regions, cities] = await Promise.all([
    fetchPlaces("regions"),
    points.some(isCityCandidate) ? fetchPlaces("cities") : [],
  ]);
  const places = new Map();
  for (const point of points) {
    const [lon, lat] = point;
    const region = regionAt(regions, lon, lat);
    const city = isCityCandidate(point) && nearbyCity(cities, lon, lat, region?.[1]);
    if (city) {
      const [name, cityLon, cityLat] = city;
      places.set(`city:${cityLon},${cityLat}`, { name, lon: cityLon, lat: cityLat });
    } else if (region) {
      const [name] = region;
      if (!places.has(`region:${name}`)) places.set(`region:${name}`, { name, lon, lat, region: true });
    } else {
      places.set(`point:${lon},${lat}`, { lon, lat });
    }
  }
  return [...places.values()];
}
