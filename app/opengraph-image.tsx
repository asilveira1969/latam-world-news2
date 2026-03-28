import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LATAM World News";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgb(10, 27, 43) 0%, rgb(20, 69, 110) 45%, rgb(205, 139, 44) 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 36%), radial-gradient(circle at bottom right, rgba(255,255,255,0.12), transparent 30%)"
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px",
            position: "relative"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "#f6c453",
                display: "flex"
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase"
              }}
            >
              LATAM World News
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 860
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 74,
                lineHeight: 1.05,
                fontWeight: 800
              }}
            >
              Noticias internacionales con contexto para America Latina
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.3,
                color: "rgba(255,255,255,0.88)"
              }}
            >
              Analisis, curacion editorial y cobertura global en espanol.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 26,
              color: "rgba(255,255,255,0.86)"
            }}
          >
            <div style={{ display: "flex" }}>latamworldnews.com</div>
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.18)"
              }}
            >
              Mundo | LATAM | Economia | Tecnologia
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
