import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Same mark as icon.tsx, rendered at Apple's home-screen size (no rounded
// corners — iOS applies its own mask).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
          color: "white",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        IO
      </div>
    ),
    { ...size }
  );
}
