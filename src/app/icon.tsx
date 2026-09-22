import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Matches the LogoMark: rounded indigo gradient tile with a white compass.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
          color: "white",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        IO
      </div>
    ),
    { ...size }
  );
}
