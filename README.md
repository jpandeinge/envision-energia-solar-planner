# Envision Energia Solar Planner

Customer-facing planning MVP for residential solar projects in Namibia.

## What this version does

- captures coordinates and rooftop or ground installation type;
- lets a user trace an installation surface on an interactive planning canvas;
- estimates usable area and physical panel capacity;
- sizes panels, inverter and LFP battery storage from energy needs and project goal;
- shows calculation assumptions and space constraints;
- compares versioned public supplier records with source links, timestamps, stock state, VAT scope and missing-data warnings;
- explains every energy-profile variable with touch- and keyboard-accessible helpers;
- prints a standardized planning brief for supplier quotations.

This is a planning tool, not a certified electrical or structural design. Production use requires a licensed imagery/geocoding provider, live solar-resource data, distributor-aware tariff and regulation data, supplier-authorized catalog feeds, persistence, and installer validation.

The site is wired for Google Maps JavaScript API hybrid imagery and Namibia-restricted property search. Add a browser-restricted key to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; enable both Maps JavaScript API and Places API (New) in the same Google Cloud project. Drawing is implemented in the app because Google removed its legacy Drawing Library in May 2026.

## Run locally

```bash
npm install
cp .env.example .env.local
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

The version 0.2 planning engine uses:

- the named JinkoSolar JKM475M-7RL3 reference module (475 W, 2182 × 1029 × 35 mm) from the manufacturer datasheet;
- 1,720 kWh/kWp/year planning yield;
- 22% rooftop or 15% ground surface allowance plus a transparent 90% layout-packing factor;
- 5.12 kWh modular LFP storage increments;
- explicit battery depth-of-discharge, conversion-efficiency and design-reserve factors;
- no fabricated inverter, balance-of-system or installation prices. A complete price remains “quote required” until a supplier-authorized bill of materials is available.

All assumptions are visible in the customer journey. Supplier records are dated and source-linked; live accuracy still requires supplier-authorized feeds or a managed catalogue refresh process.
