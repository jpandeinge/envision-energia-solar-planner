type PvgisResponse = {
  inputs?: {
    meteo_data?: {
      radiation_db?: string;
      year_min?: number;
      year_max?: number;
    };
  };
  outputs?: {
    monthly?: { fixed?: Array<{ month?: number; E_m?: number }> };
    totals?: { fixed?: { E_y?: number } };
  };
};

const PVGIS_ENDPOINT = "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc";

function finiteNumber(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const latitude = finiteNumber(query.get("lat"));
  const longitude = finiteNumber(query.get("lon"));
  const angle = finiteNumber(query.get("angle"));
  const aspect = finiteNumber(query.get("aspect"));

  if (
    latitude === null ||
    longitude === null ||
    angle === null ||
    aspect === null
  ) {
    return errorResponse("Latitude, longitude, angle and aspect are required.", 400);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return errorResponse("The coordinates are outside valid geographic bounds.", 400);
  }
  if (angle < 0 || angle > 90 || aspect < -180 || aspect > 180) {
    return errorResponse("The surface angle or direction is outside valid bounds.", 400);
  }

  const upstreamQuery = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    peakpower: "1",
    loss: "14",
    angle: angle.toString(),
    aspect: aspect.toString(),
    pvtechchoice: "crystSi",
    mountingplace: "free",
    usehorizon: "1",
    outputformat: "json",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const upstream = await fetch(`${PVGIS_ENDPOINT}?${upstreamQuery}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      return errorResponse("The solar-resource service did not return a result.", 502);
    }

    const payload = (await upstream.json()) as PvgisResponse;
    const annualKwh = payload.outputs?.totals?.fixed?.E_y;
    const monthly = payload.outputs?.monthly?.fixed ?? [];
    const monthlyKwhPerKwp = Array.from({ length: 12 }, (_, index) => {
      const record = monthly.find((entry) => entry.month === index + 1);
      return typeof record?.E_m === "number" ? record.E_m : null;
    });

    if (
      typeof annualKwh !== "number" ||
      annualKwh <= 0 ||
      monthlyKwhPerKwp.some((value) => value === null)
    ) {
      return errorResponse("The solar-resource response was incomplete.", 502);
    }

    return Response.json(
      {
        specificYieldKwhPerKwp: annualKwh,
        monthlyKwhPerKwp,
        source: "European Commission JRC · PVGIS 5.3",
        radiationDatabase:
          payload.inputs?.meteo_data?.radiation_db ?? "PVGIS default",
        dataPeriod: {
          start: payload.inputs?.meteo_data?.year_min ?? null,
          end: payload.inputs?.meteo_data?.year_max ?? null,
        },
        assumptions: {
          systemLossPercent: 14,
          horizonModel: true,
          peakPowerKwp: 1,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return errorResponse("The solar-resource service is temporarily unavailable.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
