export type SolarGoal = "grid" | "hybrid" | "offgrid";
export type InstallationType = "roof" | "ground";
export type SupplyPhase = "Single phase" | "Three phase" | "Not sure";

export type SolarPlanInput = {
  annualLoadKwh: number;
  specificYieldKwhPerKwp: number;
  maxPanels: number;
  panelPowerWatts: number;
  panelFootprintM2: number;
  goal: SolarGoal;
  phase: SupplyPhase;
  breakerAmps: number;
  backupHours: number;
  criticalLoadKw: number;
};

export const ENGINE_VERSION = "planning-engine-0.3.0";
export const FALLBACK_SPECIFIC_YIELD_KWH_PER_KWP = 1720;
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
  const annualLoadKwh = Math.max(1, safeNumber(input.annualLoadKwh, 1));
  const specificYieldKwhPerKwp = Math.max(
    1,
    safeNumber(
      input.specificYieldKwhPerKwp,
      FALLBACK_SPECIFIC_YIELD_KWH_PER_KWP,
    ),
  );
  const maxPanels = Math.floor(safeNumber(input.maxPanels));
  const panelPowerWatts = Math.max(1, safeNumber(input.panelPowerWatts, 1));
  const panelFootprintM2 = safeNumber(input.panelFootprintM2);
  const criticalLoadKw = safeNumber(input.criticalLoadKw);
  const backupHours = safeNumber(input.backupHours);

  const requiredArrayKwp =
    (annualLoadKwh * TARGET_COVERAGE[input.goal]) / specificYieldKwhPerKwp;
  const neededPanels = Math.max(
    1,
    Math.ceil((requiredArrayKwp * 1000) / panelPowerWatts),
  );
  const panels = Math.min(neededPanels, maxPanels);
  const capacityKwp = (panels * panelPowerWatts) / 1000;
  const annualGenerationKwh = capacityKwp * specificYieldKwhPerKwp;
  const coveragePercent = Math.min(
    135,
    (annualGenerationKwh / annualLoadKwh) * 100,
  );

  const averageDailyLoadKwh = annualLoadKwh / 365;
  const requiredUsableBatteryKwh =
    input.goal === "grid"
      ? 0
      : input.goal === "hybrid"
        ? criticalLoadKw * backupHours
        : averageDailyLoadKwh;
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
    averageDailyLoadKwh,
    specificYieldKwhPerKwp,
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
    constrained: neededPanels > maxPanels,
  };
}
