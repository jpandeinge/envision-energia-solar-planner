export type SurfaceDirection =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

export const SURFACE_DIRECTIONS: ReadonlyArray<{
  value: SurfaceDirection;
  label: string;
}> = [
  { value: "north", label: "North" },
  { value: "north-east", label: "North-east" },
  { value: "east", label: "East" },
  { value: "south-east", label: "South-east" },
  { value: "south", label: "South" },
  { value: "south-west", label: "South-west" },
  { value: "west", label: "West" },
  { value: "north-west", label: "North-west" },
];

const PVGIS_ASPECT_BY_DIRECTION: Record<SurfaceDirection, number> = {
  north: 180,
  "north-east": -135,
  east: -90,
  "south-east": -45,
  south: 0,
  "south-west": 45,
  west: 90,
  "north-west": 135,
};

/** PVGIS uses 0° for south, -90° for east and 90° for west. */
export function compassToPvgisAspect(direction: SurfaceDirection) {
  return PVGIS_ASPECT_BY_DIRECTION[direction];
}
