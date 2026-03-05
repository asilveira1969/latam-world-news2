import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");

  return NextResponse.json(
    {
      ok: false,
      implemented: false,
      received: typeof email === "string" ? email : null,
      message: "Placeholder endpoint. Newsletter provider is not integrated yet."
    },
    { status: 501 }
  );
}
