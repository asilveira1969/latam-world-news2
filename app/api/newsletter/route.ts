import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");

  return NextResponse.json(
    {
      ok: true,
      implemented: false,
      received: typeof email === "string" ? email : null,
      message:
        "El newsletter todav\u00eda no est\u00e1 activo. El sitio registr\u00f3 la intenci\u00f3n de contacto, pero no procesa altas autom\u00e1ticas por ahora."
    },
    { status: 202 }
  );
}
