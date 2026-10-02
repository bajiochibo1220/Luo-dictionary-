import { NextResponse } from "next/server";

const unavailable = () =>
  NextResponse.json(
    { success: false, error: "Administrator accounts can only be created by an authorized Super Admin." },
    { status: 403 },
  );

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
