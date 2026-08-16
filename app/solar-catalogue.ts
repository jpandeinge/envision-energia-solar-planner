export type SupplierPanelOffer = {
  id: string;
  supplier: string;
  supplierType: string;
  productName: string;
  sku: string;
  powerWatts: number;
  dimensionsMm: {
    length: number;
    width: number;
    depth: number;
  } | null;
  priceNad: number | null;
  vatStatus: string;
  availability: string;
  availabilityTone: "available" | "unavailable" | "quote";
  observedAt: string;
  sourceUrl: string;
  specificationUrl?: string;
  evidenceNote: string;
};

export type PublicSystemOffer = {
  id: string;
  supplier: string;
  productName: string;
  ratedPowerKw: number;
  priceNad: number;
  observedAt: string;
  sourceUrl: string;
};

export const CATALOGUE_VERSION = "NA-supplier-catalogue-2026-08-16";

/**
 * Reference module used by the sizing engine.
 *
 * Pupkewitz Megatech publicly lists this exact model, while the manufacturer
 * publishes its electrical and mechanical specification. A supplier price is
 * intentionally not inferred from a zero-price/quote-led listing.
 */
export const REFERENCE_PANEL = {
  manufacturer: "JinkoSolar",
  model: "JKM475M-7RL3",
  powerWatts: 475,
  lengthMm: 2182,
  widthMm: 1029,
  depthMm: 35,
  specificationUrl:
    "https://www.jinkosolar.com/uploads/JKM460-480M-7RL3-%28V%29-F1-EN.pdf",
  supplierUrl: "https://pupkewitzmegatech.com/shop-2/?product-page=3",
} as const;

export const SUPPLIER_PANEL_OFFERS: SupplierPanelOffer[] = [
  {
    id: "megabuild-steco-590",
    supplier: "Pupkewitz Megabuild",
    supplierType: "Retail catalogue · Namibia",
    productName: "Steco Solar Panel 590W",
    sku: "E0010368",
    powerWatts: 590,
    dimensionsMm: null,
    priceNad: 2115,
    vatStatus: "VAT included",
    availability: "Shown in stock online",
    availabilityTone: "available",
    observedAt: "2026-08-16",
    sourceUrl:
      "https://shop.megabuild.com.na/catalogue/solar-panels-e060106/1",
    evidenceNote:
      "Retail price and power are public; exact module dimensions are not shown on the catalogue page.",
  },
  {
    id: "electro-dynamics-sp330w",
    supplier: "Electro Dynamics",
    supplierType: "Electrical retailer · Namibia",
    productName: "A Grade Mono Crystalline 330W",
    sku: "SP330W",
    powerWatts: 330,
    dimensionsMm: { length: 1956, width: 992, depth: 40 },
    priceNad: 2160.16,
    vatStatus: "VAT status not stated",
    availability: "Shown out of stock online",
    availabilityTone: "unavailable",
    observedAt: "2026-08-16",
    sourceUrl:
      "https://www.electrodynamics.com.na/product/solar-panel-330w-a-grade-mono-crystalline/",
    evidenceNote:
      "Price, power, SKU and dimensions are published on the product page; availability prevents treating this as an orderable quote.",
  },
  {
    id: "megatech-jinko-475",
    supplier: "Pupkewitz Megatech ReEnSol",
    supplierType: "Renewable-energy solutions · Namibia",
    productName: "Jinko JKM475M-7RL3",
    sku: "JKM475M-7RL3",
    powerWatts: 475,
    dimensionsMm: { length: 2182, width: 1029, depth: 35 },
    priceNad: null,
    vatStatus: "Confirm in supplier quote",
    availability: "Quote required",
    availabilityTone: "quote",
    observedAt: "2026-08-16",
    sourceUrl: "https://pupkewitzmegatech.com/shop-2/?product-page=3",
    specificationUrl:
      "https://www.jinkosolar.com/uploads/JKM460-480M-7RL3-%28V%29-F1-EN.pdf",
    evidenceNote:
      "Supplier product listing and manufacturer specification are public; no public selling price is claimed.",
  },
];

export const PUBLIC_SYSTEM_OFFERS: PublicSystemOffer[] = [
  {
    id: "megatech-deye-5kw",
    supplier: "Pupkewitz Megatech",
    productName: "5 kW Deye Lithium Kit",
    ratedPowerKw: 5,
    priceNad: 68467,
    observedAt: "2026-08-16",
    sourceUrl:
      "https://pupkewitzmegatech.com/product-category/renewable-energy-solutions/",
  },
  {
    id: "megatech-victron-5kw",
    supplier: "Pupkewitz Megatech",
    productName: "5 kW Victron Lithium Kit",
    ratedPowerKw: 5,
    priceNad: 79037,
    observedAt: "2026-08-16",
    sourceUrl:
      "https://pupkewitzmegatech.com/product-category/renewable-energy-solutions/",
  },
  {
    id: "megatech-deye-8kw",
    supplier: "Pupkewitz Megatech",
    productName: "8 kW Deye Lithium Kit",
    ratedPowerKw: 8,
    priceNad: 111334,
    observedAt: "2026-08-16",
    sourceUrl:
      "https://pupkewitzmegatech.com/product-category/renewable-energy-solutions/",
  },
];

