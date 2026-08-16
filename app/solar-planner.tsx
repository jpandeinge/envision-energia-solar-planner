"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Point = { x: number; y: number };
type Goal = "grid" | "hybrid" | "offgrid";
type InstallType = "roof" | "ground";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const METRES_PER_PIXEL = 0.052;
const PANEL_WIDTH_METRES = 1.134;
const PANEL_HEIGHT_METRES = 2.278;
const PANEL_POWER_WATTS = 590;
const SPECIFIC_YIELD = 1720;

const defaultSurface: Point[] = [
  { x: 250, y: 145 },
  { x: 560, y: 124 },
  { x: 625, y: 284 },
  { x: 530, y: 342 },
  { x: 238, y: 314 },
  { x: 198, y: 215 },
];

const steps = [
  { number: 1, label: "Site" },
  { number: 2, label: "Energy" },
  { number: 3, label: "System" },
  { number: 4, label: "Compare" },
];

const money = new Intl.NumberFormat("en-NA", {
  style: "currency",
  currency: "NAD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-NA", {
  maximumFractionDigits: 1,
});

function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum / 2) * METRES_PER_PIXEL ** 2;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function chooseInverter(requiredKw: number) {
  const sizes = [3.6, 5, 8, 12, 16, 20];
  return sizes.find((size) => size >= requiredKw) ?? 20;
}

function ceilToBatteryModule(kwh: number) {
  if (kwh <= 0) return 0;
  return Math.ceil(kwh / 5.12) * 5.12;
}

function SolarMark() {
  return (
    <span className="solar-mark" aria-hidden="true">
      <span>ϟ</span>
    </span>
  );
}

function SiteCanvas({
  points,
  setPoints,
  closed,
  setClosed,
  drawing,
  installType,
  panelCount,
  showPanels,
}: {
  points: Point[];
  setPoints: (points: Point[]) => void;
  closed: boolean;
  setClosed: (closed: boolean) => void;
  drawing: boolean;
  installType: InstallType;
  panelCount: number;
  showPanels: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#20342c");
    gradient.addColorStop(0.5, "#34453a");
    gradient.addColorStop(1, "#6c6f56");
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.strokeStyle = "rgba(247, 241, 210, 0.14)";
    context.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 52) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, CANVAS_HEIGHT);
      context.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 52) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(CANVAS_WIDTH, y);
      context.stroke();
    }

    context.strokeStyle = "#8f927c";
    context.lineWidth = 70;
    context.beginPath();
    context.moveTo(720, -30);
    context.bezierCurveTo(650, 120, 780, 330, 690, 560);
    context.stroke();
    context.strokeStyle = "rgba(246, 238, 202, 0.42)";
    context.lineWidth = 3;
    context.setLineDash([18, 18]);
    context.stroke();
    context.setLineDash([]);

    const buildings = [
      [58, 72, 130, 84, -0.08],
      [82, 370, 156, 74, 0.04],
      [680, 78, 110, 72, 0.18],
      [730, 360, 126, 88, -0.12],
    ] as const;
    buildings.forEach(([x, y, width, height, rotation]) => {
      context.save();
      context.translate(x + width / 2, y + height / 2);
      context.rotate(rotation);
      context.fillStyle = "#5a5b50";
      context.fillRect(-width / 2, -height / 2, width, height);
      context.strokeStyle = "rgba(241, 232, 198, 0.34)";
      context.lineWidth = 3;
      context.strokeRect(-width / 2, -height / 2, width, height);
      context.restore();
    });

    if (points.length > 0) {
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }
      if (closed) context.closePath();
      context.fillStyle =
        installType === "roof" ? "rgba(29, 111, 242, 0.22)" : "rgba(210, 231, 98, 0.18)";
      context.fill();
      context.strokeStyle = installType === "roof" ? "#a8ccff" : "#d9ed75";
      context.lineWidth = 4;
      context.stroke();
    }

    if (closed && showPanels && points.length >= 3) {
      context.save();
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.closePath();
      context.clip();
      let placed = 0;
      for (let y = 150; y < 350 && placed < panelCount; y += 47) {
        for (let x = 215; x < 625 && placed < panelCount; x += 31) {
          if (!pointInPolygon({ x: x + 13, y: y + 20 }, points)) continue;
          context.fillStyle = "#173f6d";
          context.fillRect(x, y, 25, 40);
          context.strokeStyle = "rgba(184, 220, 255, 0.78)";
          context.lineWidth = 1.5;
          context.strokeRect(x, y, 25, 40);
          context.beginPath();
          context.moveTo(x + 12.5, y);
          context.lineTo(x + 12.5, y + 40);
          context.stroke();
          placed += 1;
        }
      }
      context.restore();
    }

    points.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.fillStyle = "#f6f3e6";
      context.fill();
      context.strokeStyle = "#163f68";
      context.lineWidth = 3;
      context.stroke();
      if (!closed && index === 0) {
        context.beginPath();
        context.arc(point.x, point.y, 15, 0, Math.PI * 2);
        context.strokeStyle = "rgba(246, 243, 230, 0.65)";
        context.lineWidth = 2;
        context.stroke();
      }
    });
  }, [closed, installType, panelCount, points, showPanels]);

  const addPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || closed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const next = {
      x: ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT,
    };
    if (points.length >= 3) {
      const first = points[0];
      const distance = Math.hypot(next.x - first.x, next.y - first.y);
      if (distance < 24) {
        setClosed(true);
        return;
      }
    }
    setPoints([...points, next]);
  };

  return (
    <div className="site-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={drawing && !closed ? "site-canvas is-drawing" : "site-canvas"}
        onPointerDown={addPoint}
        aria-label="Interactive property surface drawing canvas"
      >
        Your browser does not support the interactive site canvas.
      </canvas>
      <div className="map-layer-badge">
        <span className="status-dot" /> Planning canvas
      </div>
      <div className="map-scale">10 m</div>
      {!closed && drawing ? (
        <div className="canvas-tip">Tap corners · tap the first point to close</div>
      ) : null}
    </div>
  );
}

export function SolarPlanner() {
  const [step, setStep] = useState(1);
  const [points, setPoints] = useState<Point[]>(defaultSurface);
  const [closed, setClosed] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [installType, setInstallType] = useState<InstallType>("roof");
  const [latitude, setLatitude] = useState("-22.5609");
  const [longitude, setLongitude] = useState("17.0658");
  const [locationName, setLocationName] = useState("Klein Windhoek, Namibia");
  const [pitch, setPitch] = useState(18);
  const [monthlyKwh, setMonthlyKwh] = useState(620);
  const [monthlyBill, setMonthlyBill] = useState(1650);
  const [goal, setGoal] = useState<Goal>("hybrid");
  const [phase, setPhase] = useState("Single phase");
  const [breaker, setBreaker] = useState(60);
  const [backupHours, setBackupHours] = useState(6);
  const [criticalLoad, setCriticalLoad] = useState(1.8);
  const [locationMessage, setLocationMessage] = useState("");

  const rawArea = polygonArea(points);
  const usableRatio = installType === "roof" ? 0.78 : 0.85;
  const usableArea = rawArea * usableRatio;
  const panelArea = PANEL_WIDTH_METRES * PANEL_HEIGHT_METRES * 1.16;
  const maxPanels = Math.max(0, Math.floor(usableArea / panelArea));

  const results = useMemo(() => {
    const targetShare = goal === "grid" ? 0.76 : goal === "hybrid" ? 0.92 : 1.15;
    const neededKwp = (monthlyKwh * 12 * targetShare) / SPECIFIC_YIELD;
    const neededPanels = Math.max(1, Math.ceil((neededKwp * 1000) / PANEL_POWER_WATTS));
    const panels = Math.min(neededPanels, maxPanels || neededPanels);
    const capacityKwp = (panels * PANEL_POWER_WATTS) / 1000;
    const annualGeneration = capacityKwp * SPECIFIC_YIELD;
    const coverage = Math.min(135, (annualGeneration / (monthlyKwh * 12)) * 100);
    const batteryRaw =
      goal === "grid"
        ? 0
        : goal === "hybrid"
          ? (criticalLoad * backupHours) / (0.9 * 0.92)
          : (monthlyKwh / 30) * 1.25;
    const batteryKwh = ceilToBatteryModule(batteryRaw);
    const inverterKw = chooseInverter(Math.max(capacityKwp / 1.25, criticalLoad * 1.15));
    const panelSubtotal = panels * 2115;
    const inverterAllowance = 10500 + inverterKw * 1850;
    const batteryAllowance = batteryKwh * 3850;
    const balanceOfSystem = panels * 1080;
    const installationAllowance = 9500 + capacityKwp * 900;
    const midpoint =
      panelSubtotal +
      inverterAllowance +
      batteryAllowance +
      balanceOfSystem +
      installationAllowance;

    return {
      neededPanels,
      panels,
      capacityKwp,
      annualGeneration,
      coverage,
      batteryKwh,
      inverterKw,
      midpoint,
      lowBudget: midpoint * 0.88,
      highBudget: midpoint * 1.14,
      constrained: maxPanels > 0 && neededPanels > maxPanels,
    };
  }, [backupHours, criticalLoad, goal, maxPanels, monthlyKwh]);

  const resetSurface = useCallback(() => {
    setPoints([]);
    setClosed(false);
    setDrawing(true);
  }, []);

  const useDemoSurface = useCallback(() => {
    setPoints(defaultSurface);
    setClosed(true);
    setDrawing(false);
  }, []);

  const getCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Location access is not supported by this browser.");
      return;
    }
    setLocationMessage("Locating…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationName("Current location");
        setLocationMessage("Coordinates updated. Confirm the property on the map.");
      },
      () => setLocationMessage("We could not access your location. Enter coordinates instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const panelPriceMegabuild = results.panels * 2115;
  const electroPanelCount = Math.ceil((results.capacityKwp * 1000) / 500);
  const electroPanelPrice = electroPanelCount * 1725;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Envision Energia home">
          <SolarMark />
          <span className="brand-copy">
            <strong>ENVISION ENERGIA</strong>
            <small>Solar intelligence for Namibia</small>
          </span>
        </a>
        <div className="topbar-actions">
          <span className="region-pill"><span>NA</span> Namibia</span>
          <button className="button button-quiet" type="button" onClick={useDemoSurface}>
            New estimate
          </button>
        </div>
      </header>

      <section className="workspace" id="top">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Residential solar planner</p>
            <h1>Build a solar plan around your property.</h1>
            <p className="heading-copy">
              Draw the available space, tell us how you use electricity, and get a transparent
              system estimate before speaking to an installer.
            </p>
          </div>
          <div className="trust-note">
            <span className="trust-icon">✓</span>
            <span><strong>Planning estimate</strong><small>Installer review required</small></span>
          </div>
        </div>

        <nav className="stepper" aria-label="Estimate progress">
          {steps.map((item) => (
            <button
              key={item.number}
              className={item.number === step ? "step is-active" : item.number < step ? "step is-done" : "step"}
              type="button"
              onClick={() => goToStep(item.number)}
              aria-current={item.number === step ? "step" : undefined}
            >
              <span>{item.number < step ? "✓" : item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {step === 1 ? (
          <section className="planner-grid" aria-labelledby="site-title">
            <div className="map-card">
              <div className="map-toolbar">
                <div className="search-field">
                  <span aria-hidden="true">⌕</span>
                  <label className="sr-only" htmlFor="location-search">Property location</label>
                  <input
                    id="location-search"
                    value={locationName}
                    onChange={(event) => setLocationName(event.target.value)}
                    placeholder="Search an address or place"
                  />
                </div>
                <button className="icon-button" type="button" onClick={getCurrentLocation} aria-label="Use current location">
                  ◎
                </button>
              </div>
              <SiteCanvas
                points={points}
                setPoints={setPoints}
                closed={closed}
                setClosed={(value) => {
                  setClosed(value);
                  if (value) setDrawing(false);
                }}
                drawing={drawing}
                installType={installType}
                panelCount={results.panels}
                showPanels={false}
              />
              <div className="map-footer">
                <span>{latitude}, {longitude}</span>
                <span>Concept canvas · licensed satellite imagery will replace this layer</span>
              </div>
            </div>

            <aside className="control-card">
              <div className="section-number">01</div>
              <p className="eyebrow">Installation space</p>
              <h2 id="site-title">Where will the panels go?</h2>
              <p className="section-copy">Choose a surface, then trace its usable outer edge.</p>

              <div className="segmented" role="group" aria-label="Installation surface">
                <button className={installType === "roof" ? "is-selected" : ""} type="button" onClick={() => setInstallType("roof")}>
                  <span>⌂</span> Rooftop
                </button>
                <button className={installType === "ground" ? "is-selected" : ""} type="button" onClick={() => setInstallType("ground")}>
                  <span>⌁</span> Ground
                </button>
              </div>

              <div className="coordinate-grid">
                <label>Latitude<input value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" /></label>
                <label>Longitude<input value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" /></label>
              </div>
              {locationMessage ? <p className="form-message" role="status">{locationMessage}</p> : null}

              {installType === "roof" ? (
                <label className="field-label">
                  Approximate roof pitch
                  <select value={pitch} onChange={(event) => setPitch(Number(event.target.value))}>
                    <option value={5}>Almost flat · 5°</option>
                    <option value={12}>Low pitch · 12°</option>
                    <option value={18}>Typical pitch · 18°</option>
                    <option value={25}>Steep pitch · 25°</option>
                    <option value={35}>Very steep · 35°</option>
                  </select>
                </label>
              ) : null}

              <div className="surface-summary">
                <div><span>Traced area</span><strong>{number.format(rawArea)} m²</strong></div>
                <div><span>Usable after allowance</span><strong>{number.format(usableArea)} m²</strong></div>
                <div><span>Estimated panel capacity</span><strong>Up to {maxPanels || "—"}</strong></div>
              </div>

              <div className="drawing-actions">
                <button className="button button-secondary" type="button" onClick={resetSurface}>Draw again</button>
                {!closed && points.length >= 3 ? (
                  <button className="button button-secondary" type="button" onClick={() => { setClosed(true); setDrawing(false); }}>Close shape</button>
                ) : null}
              </div>

              <button className="button button-primary button-full" type="button" disabled={!closed || rawArea < 10} onClick={() => goToStep(2)}>
                Continue to energy use <span>→</span>
              </button>
              <p className="fine-print">A 22% roof allowance covers edges, access paths and small obstructions. Refine it during a site survey.</p>
            </aside>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="details-layout" aria-labelledby="energy-title">
            <div className="form-card">
              <div className="section-number">02</div>
              <p className="eyebrow">Energy profile</p>
              <h2 id="energy-title">What should solar do for you?</h2>
              <p className="section-copy">A recent electricity bill gives the most reliable first estimate.</p>

              <div className="goal-grid" role="group" aria-label="Solar goal">
                <button className={goal === "grid" ? "goal-card is-selected" : "goal-card"} type="button" onClick={() => setGoal("grid")}>
                  <span className="goal-icon">↘</span><strong>Reduce my bill</strong><small>Grid-tied, focused on daytime savings</small>
                </button>
                <button className={goal === "hybrid" ? "goal-card is-selected" : "goal-card"} type="button" onClick={() => setGoal("hybrid")}>
                  <span className="goal-icon">ϟ</span><strong>Save + backup</strong><small>Hybrid solar with essential-load backup</small>
                </button>
                <button className={goal === "offgrid" ? "goal-card is-selected" : "goal-card"} type="button" onClick={() => setGoal("offgrid")}>
                  <span className="goal-icon">○</span><strong>Live off-grid</strong><small>Higher reserve for independent operation</small>
                </button>
              </div>

              <div className="input-section">
                <div className="input-section-heading"><strong>Monthly usage</strong><span>From your latest bill</span></div>
                <div className="metric-inputs">
                  <label><span>Electricity used</span><div className="input-with-unit"><input type="number" min={50} max={10000} value={monthlyKwh} onChange={(event) => setMonthlyKwh(Number(event.target.value))} /><em>kWh / month</em></div></label>
                  <label><span>Average bill</span><div className="input-with-unit"><input type="number" min={0} value={monthlyBill} onChange={(event) => setMonthlyBill(Number(event.target.value))} /><em>N$ / month</em></div></label>
                </div>
              </div>

              <div className="input-section">
                <div className="input-section-heading"><strong>Electricity connection</strong><span>Check your meter or bill</span></div>
                <div className="metric-inputs">
                  <label><span>Supply phase</span><select value={phase} onChange={(event) => setPhase(event.target.value)}><option>Single phase</option><option>Three phase</option><option>Not sure</option></select></label>
                  <label><span>Main breaker</span><div className="input-with-unit"><input type="number" min={10} max={400} value={breaker} onChange={(event) => setBreaker(Number(event.target.value))} /><em>amps</em></div></label>
                </div>
              </div>

              {goal !== "grid" ? (
                <div className="input-section">
                  <div className="input-section-heading"><strong>Backup requirement</strong><span>Essential loads only</span></div>
                  <div className="metric-inputs">
                    <label><span>Backup duration</span><div className="input-with-unit"><input type="number" min={1} max={72} value={backupHours} onChange={(event) => setBackupHours(Number(event.target.value))} /><em>hours</em></div></label>
                    <label><span>Critical load</span><div className="input-with-unit"><input type="number" min={0.2} max={20} step={0.1} value={criticalLoad} onChange={(event) => setCriticalLoad(Number(event.target.value))} /><em>kW</em></div></label>
                  </div>
                </div>
              ) : null}

              <div className="form-footer-actions">
                <button className="button button-secondary" type="button" onClick={() => goToStep(1)}>← Back</button>
                <button className="button button-primary" type="button" onClick={() => goToStep(3)}>Calculate my system <span>→</span></button>
              </div>
            </div>

            <aside className="context-card">
              <span className="context-kicker">Your site</span>
              <h3>{locationName}</h3>
              <div className="mini-site">
                <SiteCanvas points={points} setPoints={setPoints} closed={closed} setClosed={setClosed} drawing={false} installType={installType} panelCount={results.panels} showPanels={false} />
              </div>
              <dl className="context-stats">
                <div><dt>Usable surface</dt><dd>{number.format(usableArea)} m²</dd></div>
                <div><dt>Physical limit</dt><dd>{maxPanels} panels</dd></div>
                <div><dt>Planning yield</dt><dd>{SPECIFIC_YIELD.toLocaleString()} kWh/kWp/yr</dd></div>
              </dl>
              <p>We use a conservative Namibia planning yield. Production will vary with orientation, shading, temperature and equipment.</p>
            </aside>
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby="system-title">
            <div className="result-hero">
              <div>
                <p className="eyebrow eyebrow-light">Recommended starting point</p>
                <h2 id="system-title">A {number.format(results.capacityKwp)} kWp {goal === "grid" ? "grid-tied" : goal === "hybrid" ? "hybrid" : "off-grid"} system</h2>
                <p>Designed around {monthlyKwh.toLocaleString()} kWh monthly use and the surface you traced in {locationName}.</p>
              </div>
              <div className="confidence-card"><span>Planning confidence</span><strong>Medium</strong><small>Site survey will confirm shade and roof structure</small></div>
            </div>

            {results.constrained ? (
              <div className="alert-banner"><strong>Space-limited design</strong><span>The traced surface fits {maxPanels} panels, fewer than the {results.neededPanels} needed for the target. The estimate uses the maximum that fits.</span></div>
            ) : null}

            <div className="result-grid">
              <div className="layout-card">
                <div className="card-heading-row"><div><p className="eyebrow">Surface layout</p><h3>{results.panels} full-size panels</h3></div><span className="capacity-badge">{number.format(results.capacityKwp)} kWp</span></div>
                <SiteCanvas points={points} setPoints={setPoints} closed={closed} setClosed={setClosed} drawing={false} installType={installType} panelCount={results.panels} showPanels />
                <div className="layout-note"><span>Indicative placement</span><span>{number.format(usableArea - results.panels * panelArea)} m² estimated reserve</span></div>
              </div>

              <div className="spec-card">
                <p className="eyebrow">Core equipment</p>
                <div className="spec-list">
                  <div><span className="spec-icon">▦</span><span><small>PV array</small><strong>{results.panels} × {PANEL_POWER_WATTS} W panels</strong></span><em>{number.format(results.capacityKwp)} kWp</em></div>
                  <div><span className="spec-icon">ϟ</span><span><small>Inverter</small><strong>{phase} hybrid-ready</strong></span><em>{results.inverterKw} kW</em></div>
                  <div><span className="spec-icon">▤</span><span><small>Battery storage</small><strong>{results.batteryKwh ? "Modular LFP battery" : "Not required"}</strong></span><em>{results.batteryKwh ? `${number.format(results.batteryKwh)} kWh` : "Optional"}</em></div>
                  <div><span className="spec-icon">⌁</span><span><small>Connection check</small><strong>{breaker} A main breaker</strong></span><em>Installer to verify</em></div>
                </div>
              </div>
            </div>

            <div className="outcome-grid">
              <article><span>Estimated generation</span><strong>{Math.round(results.annualGeneration).toLocaleString()} kWh</strong><small>per year · planning model</small></article>
              <article><span>Energy coverage</span><strong>{Math.round(results.coverage)}%</strong><small>annual generation vs usage</small></article>
              <article><span>Budget range</span><strong>{money.format(results.lowBudget)}–{money.format(results.highBudget)}</strong><small>equipment + planning allowances</small></article>
              <article><span>Current bill reference</span><strong>{money.format(monthlyBill)}</strong><small>per month · before solar</small></article>
            </div>

            <div className="assumption-row">
              <div><strong>How this was calculated</strong><span>{SPECIFIC_YIELD.toLocaleString()} kWh/kWp annual yield · {PANEL_POWER_WATTS} W panels · {installType === "roof" ? "22%" : "15%"} surface allowance · 8–14% budget uncertainty</span></div>
              <span className="version-tag">Engine v0.1</span>
            </div>

            <div className="result-actions">
              <button className="button button-secondary" type="button" onClick={() => goToStep(2)}>← Adjust usage</button>
              <button className="button button-primary" type="button" onClick={() => goToStep(4)}>Compare suppliers <span>→</span></button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section aria-labelledby="compare-title">
            <div className="compare-heading">
              <div><p className="eyebrow">Namibian supplier snapshot</p><h2 id="compare-title">Compare what is actually public.</h2><p>Prices below are source-linked. Missing components stay visible instead of being estimated as supplier quotes.</p></div>
              <div className="system-chip"><span>{results.panels} panels</span><span>{number.format(results.capacityKwp)} kWp</span><span>{results.batteryKwh ? `${number.format(results.batteryKwh)} kWh storage` : "No storage"}</span></div>
            </div>

            <div className="supplier-table-wrap">
              <table className="supplier-table">
                <thead><tr><th>Supplier</th><th>Closest public panel offer</th><th>Panel subtotal</th><th>Complete system</th><th>Freshness</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Pupkewitz Megabuild</strong><small>Retail catalogue · Namibia</small></td>
                    <td><strong>{results.panels} × Steco 590 W</strong><small>{money.format(2115)} each · VAT included</small></td>
                    <td><strong>{money.format(panelPriceMegabuild)}</strong><small>{money.format(2115 / 590)} / W</small></td>
                    <td><span className="incomplete-badge">Panel-only public price</span><small>Inverter, storage and installation need a quote</small></td>
                    <td><span className="fresh-badge">Verified</span><small>16 Aug 2026</small></td>
                    <td><a className="table-link" href="https://shop.megabuild.com.na/catalogue/solar-panels-e060106/1" target="_blank" rel="noreferrer">View source ↗</a></td>
                  </tr>
                  <tr>
                    <td><strong>Electro Dynamics</strong><small>Electrical retailer · Windhoek</small></td>
                    <td><strong>{electroPanelCount} × Mono 500 W</strong><small>{money.format(1725)} each · VAT status to confirm</small></td>
                    <td><strong>{money.format(electroPanelPrice)}</strong><small>{money.format(1725 / 500)} / W before VAT check</small></td>
                    <td><span className="incomplete-badge">Panel-only public price</span><small>Different panel count and specification</small></td>
                    <td><span className="fresh-badge">Verified</span><small>16 Aug 2026</small></td>
                    <td><a className="table-link" href="https://www.electrodynamics.com.na/product-category/solar-products/solar-panels/" target="_blank" rel="noreferrer">View source ↗</a></td>
                  </tr>
                  <tr>
                    <td><strong>Pupkewitz Megatech ReEnSol</strong><small>Complete renewable-energy solutions</small></td>
                    <td><strong>Matched during consultation</strong><small>Panels, inverter, batteries and accessories</small></td>
                    <td><strong>Price on request</strong><small>No public complete-system price</small></td>
                    <td><span className="complete-badge">Full solution available</span><small>Technical service and accredited installers</small></td>
                    <td><span className="quote-badge">Quote-led</span><small>Supplier confirmation required</small></td>
                    <td><a className="table-link" href="https://pupkewitzmegatech.com/renewable-energy/" target="_blank" rel="noreferrer">Request quote ↗</a></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="comparison-callout">
              <div><span className="callout-icon">i</span><p><strong>Why we do not rank a winner yet</strong>Panel wattage, VAT, warranty, stock, delivery and missing system components differ. A fair comparison requires supplier-authorized, complete bills of materials.</p></div>
              <span>Price snapshot · NAD</span>
            </div>

            <div className="quote-panel">
              <div><p className="eyebrow eyebrow-light">Next step</p><h3>Turn this plan into comparable quotes.</h3><p>Share the same site, load and equipment brief with every supplier so the responses can be normalized line by line.</p></div>
              <button className="button button-light" type="button" onClick={() => window.print()}>Print planning brief</button>
            </div>

            <div className="result-actions">
              <button className="button button-secondary" type="button" onClick={() => goToStep(3)}>← Back to system</button>
              <button className="button button-primary" type="button" onClick={() => goToStep(1)}>Start another estimate</button>
            </div>
          </section>
        ) : null}
      </section>

      <footer className="footer">
        <div className="brand footer-brand"><SolarMark /><span className="brand-copy"><strong>ENVISION ENERGIA</strong><small>Innovating the energy revolution with AI</small></span></div>
        <p>Planning estimates are not certified electrical or structural designs. Final systems require an on-site survey, qualified installer and applicable distributor approval.</p>
        <span>Windhoek · Namibia</span>
      </footer>
    </main>
  );
}
