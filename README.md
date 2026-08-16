# Envision Energia Solar Planner

Customer-facing planning MVP for residential solar projects in Namibia.

## What this version does

- captures coordinates and rooftop or ground installation type;
- lets a user trace an installation surface on an interactive planning canvas;
- estimates usable area and physical panel capacity;
- sizes panels, inverter and LFP battery storage from energy needs and project goal;
- shows calculation assumptions and space constraints;
- compares public supplier information with source links, timestamps and missing-scope warnings;
- prints a standardized planning brief for supplier quotations.

This is a planning tool, not a certified electrical or structural design. Production use requires a licensed imagery/geocoding provider, live solar-resource data, distributor-aware tariff and regulation data, supplier-authorized catalog feeds, persistence, and installer validation.

## Run locally

```bash
npm install
npm run dev
```

The local app is served at `http://localhost:3000` by default.

## Quality checks

```bash
npm run build
npm run lint
node --test tests/rendered-html.test.mjs
```

## Calculation snapshot

The first planning engine uses:

- 590 W reference modules;
- 1,720 kWh/kWp/year planning yield;
- 22% rooftop or 15% ground surface allowance;
- 5.12 kWh modular LFP storage increments;
- explicit budget allowances rather than supplier-specific fabricated totals.

All assumptions are visible in the customer journey and should be replaced by versioned production datasets as the supplier and installer partnerships are established.
