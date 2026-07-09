const EARTH_RADIUS_KM = 6371;
const toRad = deg => deg * Math.PI / 180;

function latOf(point) { return Number(point.lat ?? point.latitude); }
function lngOf(point) { return Number(point.lng ?? point.lon ?? point.longitude); }

export function haversineKm(from, to) {
  const lat1 = latOf(from), lng1 = lngOf(from), lat2 = latOf(to), lng2 = lngOf(to);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(from, to) {
  const lat1 = latOf(from), lng1 = lngOf(from), lat2 = latOf(to), lng2 = lngOf(to);
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function compassDirection(from, to, thresholdDeg = 2) {
  const latDelta = latOf(to) - latOf(from);
  const lngDelta = lngOf(to) - lngOf(from);
  if (Math.abs(latDelta) < thresholdDeg && Math.abs(lngDelta) < thresholdDeg) return { label: 'nearby', arrow: '•' };
  const ns = latDelta > thresholdDeg ? 'north' : latDelta < -thresholdDeg ? 'south' : '';
  const ew = lngDelta > thresholdDeg ? 'east' : lngDelta < -thresholdDeg ? 'west' : '';
  const label = [ns, ew].filter(Boolean).join('') || ns || ew || 'nearby';
  const arrows = { north: '↑', northeast: '↗', east: '→', southeast: '↘', south: '↓', southwest: '↙', west: '←', northwest: '↖', nearby: '•' };
  return { label, arrow: arrows[label] || '•', bearing: bearingDeg(from, to) };
}
