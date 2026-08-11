import { NextResponse } from "next/server";
import { getBootstrapStatus } from "@/lib/bootstrap-admin";

export async function GET() {
  const bootstrap = await getBootstrapStatus();
  return NextResponse.json(bootstrap);
}
