import assert from "node:assert/strict";
import test from "node:test";

import { calculatePanelLayout } from "../app/panel-layout.ts";
import { calculateSolarPlan } from "../app/solar-calculator.ts";
import { compassToPvgisAspect } from "../app/solar-yield.ts";

const basePlan = {
  annualLoadKwh: 7_440,
  specificYieldKwhPerKwp: 1_873.01,
  maxPanels: 32,
  panelPowerWatts: 475,
  panelFootprintM2: 2.182 * 1.029,
  goal: "hybrid" as const,
  phase: "Single phase" as const,
  breakerAmps: 60,
  backupHours: 6,
  criticalLoadKw: 1.8,
};

test("sizes the array from annual load and site-specific yield", () => {
  const result = calculateSolarPlan(basePlan);

  assert.equal(result.neededPanels, 8);
  assert.equal(result.panels, 8);
  assert.equal(result.capacityKwp, 3.8);
  assert.ok(Math.abs(result.annualGenerationKwh - 7_117.438) < 0.001);
  assert.equal(result.batteryKwh, 15.36);
  assert.equal(result.constrained, false);
});

test("never recommends more modules than the polygon fit", () => {
  const result = calculateSolarPlan({ ...basePlan, maxPanels: 4 });

  assert.equal(result.neededPanels, 8);
  assert.equal(result.panels, 4);
  assert.equal(result.constrained, true);
});

test("fits published module dimensions inside a polygon with setbacks", () => {
  const polygon = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const roof = calculatePanelLayout({
    polygon,
    panelWidthM: 1.029,
    panelLengthM: 2.182,
    installationType: "roof",
  });
  const ground = calculatePanelLayout({
    polygon,
    panelWidthM: 1.029,
    panelLengthM: 2.182,
    installationType: "ground",
  });

  assert.equal(roof.tracedAreaM2, 100);
  assert.equal(roof.setbackM, 0.3);
  assert.equal(roof.placements.length, 32);
  assert.equal(ground.placements.length, 24);
  assert.ok(roof.placements.length > ground.placements.length);
});

test("converts compass directions to the PVGIS azimuth convention", () => {
  assert.equal(compassToPvgisAspect("south"), 0);
  assert.equal(compassToPvgisAspect("east"), -90);
  assert.equal(compassToPvgisAspect("west"), 90);
  assert.equal(compassToPvgisAspect("north"), 180);
});
