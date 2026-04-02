import { NextResponse } from "next/server";
import { prisma } from "@/lib/technical-services/persistence/prisma";
import { withAdmin } from "@/lib/technical-services/security/middleware";
import { SessionUser } from "@/lib/technical-services/security/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

type UpdateBody = {
  name?: string;
  type?: string;
  provider?: string;
  stationId?: string;
  stationName?: string;
  lat?: number | null;
  lon?: number | null;
  available?: number;
  status?: string;
};

async function patchHandler(req: Request, _user: SessionUser, ctx: Params): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as UpdateBody;

    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.type !== undefined ? { type: String(body.type).trim().toUpperCase() } : {}),
        ...(body.provider !== undefined ? { provider: String(body.provider).trim() || null } : {}),
        ...(body.stationId !== undefined ? { stationId: String(body.stationId).trim() || null } : {}),
        ...(body.stationName !== undefined ? { stationName: String(body.stationName).trim() || null } : {}),
        ...(body.lat !== undefined
          ? {
              lat:
                body.lat === null || body.lat === ("" as any)
                  ? null
                  : Number(body.lat),
            }
          : {}),
        ...(body.lon !== undefined
          ? {
              lon:
                body.lon === null || body.lon === ("" as any)
                  ? null
                  : Number(body.lon),
            }
          : {}),
        ...(body.available !== undefined ? { available: Math.max(0, Number(body.available)) } : {}),
        ...(body.status !== undefined ? { status: String(body.status).trim().toUpperCase() } : {}),
      },
    });

    return NextResponse.json({ vehicle: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update vehicle." },
      { status: 500 }
    );
  }
}

async function deleteHandler(_req: Request, _user: SessionUser, ctx: Params): Promise<Response> {
  try {
    const { id } = await ctx.params;

    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to delete vehicle." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, ctx: Params) {
  const wrapped = withAdmin((authedReq, user) => patchHandler(authedReq, user, ctx));
  return wrapped(req);
}

export async function DELETE(req: Request, ctx: Params) {
  const wrapped = withAdmin((authedReq, user) => deleteHandler(authedReq, user, ctx));
  return wrapped(req);
}
