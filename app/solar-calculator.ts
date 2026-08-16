import { REFERENCE_PANEL } from "./solar-catalogue";

export type SolarGoal = "grid" | "hybrid" | "offgrid";
export type InstallationType = "roof" | "ground";
export type SupplyPhase = "Single phase" | "Three phase" | "Not sure";

export type SolarPlanInput = {
  rawAreaM2: number;
  installType: InstallationType;
  monthlyKwh: number;
  goal: SolarGoal;
  phase: SupplyPhase;
  breakerAmps: number;
  backupHours: number;
  criticalLoadKw: number;
};

export const ENGINE_VERSION = "planning-engine-0.2.0";
export const SPECIFIC_YIELD_KWH_PER_KWP = 1720;
export const SURFACE_ALLOWANCE = { roof: 0.22, ground: 0.15 } as const;
export const LAYOUT_PACKING_EFFICIENCY = 0.9;
export const DC_AC_RATIO = 1.2;
export const BATTERY_MODULE_KWH = 5.12;
export const BATTERY_DEPTH_OF_DISCHARGE = 0.9;
export const BATTERY_PATH_EFFICIENCY = 0.94;
export const BATTERY_DESIGN_RESERVE = 1.1;

const TARGET_COVERAGE = { grid: 0.76, hybrid: 0.92, offgrid: 1.15 } as const;

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function chooseInverter(requiredKw: number) {
  const sizes = [3.6, 5, 8, 12, 16, 20];
  return sizes.find((size) => size >= requiredKw) ?? 20;
}

function ceilToBatteryModule(kwh: number) {
  if (kwh <= 0) return 0;
  return Number(
    (Math.ceil(kwh / BATTERY_MODULE_KWH) * BATTERY_MODULE_KWH).toFixed(2),
  );
}

export function calculateSolarPlan(input: SolarPlanInput) {
  const rawAreaM2 = safeNumber(input.rawAreaM2);
  const monthlyKwh = Math.max(1, safeNumber(input.monthlyKwh, 1));
  const criticalLoadKw = safeNumber(input.criticalLoadKw);
  const backupHours = safeNumber(input.backupHours);
  const surfaceAllowance = SURFACE_ALLOWANCE[input.installType];
  const usableAreaM2 = rawAreaM2 * (1 - surfaceAllowance);
  const panelFootprintM2 =
    (REFERENCE_PANEL.lengthMm / 1000) * (REFERENCE_PANEL.widthMm / 1000);
  const maxPanels = Math.max(
    0,
    Math.floor(
      (usableAreaM2 * LAYOUT_PACKING_EFFICIENCY) / panelFootprintM2,
    ),
  );

  const annualLoadKwh = monthlyKwh * 12;
  const requiredArrayKwp =
    (annualLoadKwh * TARGET_COVERAGE[input.goal]) /
    SPECIFIC_YIELD_KWH_PER_KWP;
  const neededPanels = Math.max(
    1,
    Math.ceil(
      (requiredArrayKwp * 1000) / REFERENCE_PANEL.powerWatts,
    ),
  );
  const panels = Math.min(neededPanels, maxPanels || neededPanels);
  const capacityKwp = (panels * REFERENCE_PANEL.powerWatts) / 1000;
  const annualGenerationKwh = capacityKwp * SPECIFIC_YIELD_KWH_PER_KWP;
  const coveragePercent = Math.min(
    135,
    (annualGenerationKwh / annualLoadKwh) * 100,
  );

  const requiredUsableBatteryKwh =
    input.goal === "grid"
      ? 0
      : input.goal === "hybrid"
        ? criticalLoadKw * backupHours
        : monthlyKwh / 30;
  const requiredNominalBatteryKwh =
    (requiredUsableBatteryKwh * BATTERY_DESIGN_RESERVE) /
    (BATTERY_DEPTH_OF_DISCHARGE * BATTERY_PATH_EFFICIENCY);
  const batteryKwh = ceilToBatteryModule(requiredNominalBatteryKwh);

  const inverterRequiredKw = Math.max(
    capacityKwp / DC_AC_RATIO,
    input.goal === "grid" ? 0 : criticalLoadKw * 1.25,
  );
  const inverterKw = chooseInverter(inverterRequiredKw);

  const breakerAmps = safeNumber(input.breakerAmps);
  const connectionCapacityKva =
    input.phase === "Single phase"
      ? (breakerAmps * 230) / 1000
      : input.phase === "Three phase"
        ? (Math.sqrt(3) * 400 * breakerAmps) / 1000
        : null;

  return {
    annualLoadKwh,
    usableAreaM2,
    panelFootprintM2,
    maxPanels,
    neededPanels,
    panels,
    capacityKwp,
    annualGenerationKwh,
    coveragePercent,
    requiredUsableBatteryKwh,
    batteryKwh,
    inverterRequiredKw,
    inverterKw,
    connectionCapacityKva,
    connectionReviewNeeded:
      connectionCapacityKva !== null && inverterKw > connectionCapacityKva,
    constrained: maxPanels > 0 && neededPanels > maxPanels,
    surfaceAllowance,
  };
}

