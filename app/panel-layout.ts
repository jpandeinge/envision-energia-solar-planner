export type LayoutPoint = { x: number; y: number };
export type GeographicPoint = { lat: number; lng: number };
export type PanelPlacement = {
  id: number;
  centerX: number;
  centerY: number;
  widthM: number;
  heightM: number;
  rotationDegrees: number;
};

export type PanelLayout = {
  polygon: LayoutPoint[];
  placements: PanelPlacement[];
  tracedAreaM2: number;
  panelCoveredAreaM2: number;
  setbackM: number;
  columnGapM: number;
  rowGapM: number;
};

type LayoutInput = {
  polygon: LayoutPoint[];
  panelWidthM: number;
  panelLengthM: number;
  installationType: "roof" | "ground";
};

const EARTH_RADIUS_M = 6_378_137;
const ROOF_SETBACK_M = 0.3;
const GROUND_SETBACK_M = 0.5;
const PANEL_GAP_M = 0.04;
const GROUND_ROW_GAP_M = 0.8;

function polygonArea(points: LayoutPoint[]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum / 2);
}

function rotate(point: LayoutPoint, radians: number): LayoutPoint {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function pointInPolygon(point: LayoutPoint, polygon: LayoutPoint[]) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const a = polygon[index];
    const b = polygon[previous];
    const denominator = b.y - a.y || Number.EPSILON;
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / denominator + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(
  point: LayoutPoint,
  start: LayoutPoint,
  end: LayoutPoint,
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    point.x - (start.x + projection * deltaX),
    point.y - (start.y + projection * deltaY),
  );
}

function safelyInside(
  center: LayoutPoint,
  width: number,
  height: number,
  polygon: LayoutPoint[],
  setback: number,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const samples: LayoutPoint[] = [];
  const fractions = [-1, -0.5, 0, 0.5, 1];

  for (const fraction of fractions) {
    samples.push(
      { x: center.x + fraction * halfWidth, y: center.y - halfHeight },
      { x: center.x + fraction * halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + fraction * halfHeight },
      { x: center.x + halfWidth, y: center.y + fraction * halfHeight },
    );
  }

  return samples.every((sample) => {
    if (!pointInPolygon(sample, polygon)) return false;
    for (let index = 0; index < polygon.length; index += 1) {
      const next = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(sample, polygon[index], next) < setback - 1e-6) {
        return false;
      }
    }
    return true;
  });
}

function longestEdgeAngle(polygon: LayoutPoint[]) {
  let longest = 0;
  let angle = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const length = Math.hypot(next.x - current.x, next.y - current.y);
    if (length > longest) {
      longest = length;
      angle = Math.atan2(next.y - current.y, next.x - current.x);
    }
  }
  return angle;
}

function placeAtAngle(
  polygon: LayoutPoint[],
  panelWidth: number,
  panelHeight: number,
  rotationRadians: number,
  setback: number,
  columnGap: number,
  rowGap: number,
) {
  const rotatedPolygon = polygon.map((point) => rotate(point, -rotationRadians));
  const xs = rotatedPolygon.map((point) => point.x);
  const ys = rotatedPolygon.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const columnPitch = panelWidth + columnGap;
  const rowPitch = panelHeight + rowGap;
  const offsets = [0, 0.25, 0.5, 0.75];
  let best: LayoutPoint[] = [];

  for (const xOffset of offsets) {
    for (const yOffset of offsets) {
      const candidate: LayoutPoint[] = [];
      for (
        let y = minY + setback + panelHeight / 2 + yOffset * rowPitch;
        y <= maxY - setback - panelHeight / 2 + 1e-6;
        y += rowPitch
      ) {
        for (
          let x = minX + setback + panelWidth / 2 + xOffset * columnPitch;
          x <= maxX - setback - panelWidth / 2 + 1e-6;
          x += columnPitch
        ) {
          const center = { x, y };
          if (
            safelyInside(
              center,
              panelWidth,
              panelHeight,
              rotatedPolygon,
              setback,
            )
          ) {
            candidate.push(center);
          }
        }
      }
      if (candidate.length > best.length) best = candidate;
    }
  }

  return best.map((center, index) => {
    const unrotated = rotate(center, rotationRadians);
    return {
      id: index,
      centerX: unrotated.x,
      centerY: unrotated.y,
      widthM: panelWidth,
      heightM: panelHeight,
      rotationDegrees: (rotationRadians * 180) / Math.PI,
    };
  });
}

export function geographicPolygonToMetres(
  points: GeographicPoint[],
): LayoutPoint[] {
  if (points.length === 0) return [];
  const radians = Math.PI / 180;
  const latitudeOrigin =
    points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const longitudeOrigin =
    points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  const longitudeScale = Math.cos(latitudeOrigin * radians);

  return points.map((point) => ({
    x:
      (point.lng - longitudeOrigin) *
      radians *
      EARTH_RADIUS_M *
      longitudeScale,
    y: (point.lat - latitudeOrigin) * radians * EARTH_RADIUS_M,
  }));
}

export function canvasPolygonToMetres(
  points: LayoutPoint[],
  metresPerPixel: number,
): LayoutPoint[] {
  return points.map((point) => ({
    x: point.x * metresPerPixel,
    y: point.y * metresPerPixel,
  }));
}

export function calculatePanelLayout(input: LayoutInput): PanelLayout {
  const polygon = input.polygon.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  const panelWidth = Math.max(0, input.panelWidthM);
  const panelLength = Math.max(0, input.panelLengthM);
  const setback =
    input.installationType === "roof" ? ROOF_SETBACK_M : GROUND_SETBACK_M;
  const rowGap =
    input.installationType === "roof" ? PANEL_GAP_M : GROUND_ROW_GAP_M;

  if (polygon.length < 3 || panelWidth === 0 || panelLength === 0) {
    return {
      polygon,
      placements: [],
      tracedAreaM2: polygonArea(polygon),
      panelCoveredAreaM2: 0,
      setbackM: setback,
      columnGapM: PANEL_GAP_M,
      rowGapM: rowGap,
    };
  }

  const baseAngle = longestEdgeAngle(polygon);
  const candidates = [baseAngle, baseAngle + Math.PI / 2].map((angle) =>
    placeAtAngle(
      polygon,
      panelWidth,
      panelLength,
      angle,
      setback,
      PANEL_GAP_M,
      rowGap,
    ),
  );
  const placements = candidates.reduce((best, candidate) =>
    candidate.length > best.length ? candidate : best,
  );

  return {
    polygon,
    placements,
    tracedAreaM2: polygonArea(polygon),
    panelCoveredAreaM2: placements.length * panelWidth * panelLength,
    setbackM: setback,
    columnGapM: PANEL_GAP_M,
    rowGapM: rowGap,
  };
}
