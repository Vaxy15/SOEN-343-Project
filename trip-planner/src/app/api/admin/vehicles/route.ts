import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/withAuth";
import { SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreateBody = {
  name: string;
  type?: string;
  provider?: string;
  stationId?: string;
  stationName?: string;
  lat?: number;
  lon?: number;
  available?: number;
  status?: string;
};

async function getHandler(_req: Request, _user: SessionUser): Promise<Response> {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

async function postHandler(req: Request, _user: SessionUser): Promise<Response> {
  try {
    const body = (await req.json()) as CreateBody;

    const name = String(body.name ?? "").trim();
    const type = String(body.type ?? "BIKE").trim().toUpperCase();
    const provider = String(body.provider ?? "").trim();
    const stationId = String(body.stationId ?? "").trim();
    const stationName = String(body.stationName ?? "").trim();
    const lat =
      body.lat === undefined || body.lat === null || body.lat === ""
        ? null
        : Number(body.lat);
    const lon =
      body.lon === undefined || body.lon === null || body.lon === ""
        ? null
        : Number(body.lon);
    const available = Math.max(0, Number(body.available ?? 0));
    const status = String(body.status ?? "ACTIVE").trim().toUpperCase();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (type === "BIKE" && (!stationId || !stationName)) {
      return NextResponse.json(
        { error: "stationId and stationName are required for bikes" },
        { status: 400 }
      );
    }

    if (type === "BIKE" && (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon))) {
      return NextResponse.json(
        { error: "lat and lon are required for bikes so they can appear on the map" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        type,
        provider: provider || null,
        stationId: stationId || null,
        stationName: stationName || null,
        lat,
        lon,
        available,
        status,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to create vehicle." },
      { status: 500 }
    );
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);