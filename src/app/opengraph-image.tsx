import { ImageResponse } from "next/og";

export const alt = "InterviewOS — Practice your interview before the real one.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Branded social-share card: dark panel, gradient headline, feature summary.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1020 0%, #1a1f3a 100%)",
          padding: "0 120px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
              color: "white",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            IO
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "white" }}>
            Interview<span style={{ color: "#818cf8", display: "flex" }}>OS</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "white",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Practice your interview before the real one.
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "#b8c0de",
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          Realistic, role-specific questions — written or spoken aloud with an AI interviewer —
          with scored feedback on every answer.
        </div>
      </div>
    ),
    { ...size }
  );
}
