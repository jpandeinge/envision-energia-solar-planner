# Envision Energia Solar Planner

A production-oriented residential solar planning application for Namibia.

## Capabilities

- Google hybrid satellite map with Namibia-focused Places search and current-location startup.
- Editable rooftop or ground polygon drawing preserved throughout the planning journey.
- Geometric module placement using published panel dimensions, boundary setbacks and row gaps.
- Roof or panel tilt and eight compass orientations.
- Quick-average or twelve-month electricity-consumption entry.
- Coordinate-, tilt- and orientation-specific PVGIS solar-production modelling, with a labelled resilience fallback.
- Grid-tied, hybrid and off-grid array, inverter and LFP battery planning.
- Monthly usage-versus-production comparison.
- Source-linked Namibian supplier records and all monetary values in Namibian dollars.
- Print-ready planning brief for normalized supplier quotations.

This remains a planning tool rather than a certified electrical or structural design. Shade, obstacles, structural loading, fire access, string design, protection and distributor approval require a qualified installer.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add a browser-restricted Google Maps key to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Enable Maps JavaScript API and Places API (New) for that key.

## Quality checks

```bash
npm test
npm run lint
```

The test suite covers the calculation engine, polygon module fit, PVGIS azimuth conversion, server rendering, current-location startup, supplier evidence and responsive comparison-table requirements.

## Deployment

The application supports two build targets from the same source:

- `npm run build` produces the current Cloudflare/Sites build.
- `npm run build:vercel` uses the official vinext Nitro adapter and produces a Vercel Build Output API bundle in `.vercel/output`.

For Vercel, configure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Production, Preview and Development. The key remains browser-visible by design and must be restricted by allowed website referrers and enabled APIs in Google Cloud.

## Calculation model

The current planning engine uses:

- the named JinkoSolar JKM475M-7RL3 reference module at 475 W and 2182 × 1029 × 35 mm;
- live PVGIS 5.3 specific yield and monthly production for the selected coordinates, tilt and direction;
- a 1,720 kWh/kWp/year fallback only when PVGIS cannot be reached;
- polygon-based module fit with explicit setbacks and installation-type row gaps;
- 5.12 kWh modular LFP storage increments;
- explicit depth-of-discharge, conversion-efficiency and design-reserve factors;
- no fabricated inverter, balance-of-system or installation prices.
