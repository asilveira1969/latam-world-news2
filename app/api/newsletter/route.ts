import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");

  return NextResponse.json(
    {
      ok: true,
      received: typeof email === "string" ? email : null,
      message: "Placeholder endpoint. Integrate newsletter provider in a later phase."
    },
    { status: 202 }
  );
}
