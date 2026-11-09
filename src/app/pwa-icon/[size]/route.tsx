import { ImageResponse } from "next/og";

/**
 * Install icons for the web app manifest, generated from the same indigo tile
 * as `icon.tsx`. Keeping this a route (rather than committed PNGs) means the
 * manifest can reference exact 192/512 sizes without shipping binary assets
 * that silently go stale.
 *
 * `maskable-512` is the same mark on a full-bleed square, which is what a
 * launcher needs: the maskable safe zone keeps "IO" inside the circle Android
 * and other platforms crop to.
 */
const ICON_SIZES = {
  "192": 192,
  "512": 512,
  "maskable-512": 512,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  if (!(size in ICON_SIZES)) {
    return new Response("Not found", { status: 404 });
  }

  const pixels = ICON_SIZES[size as keyof typeof ICON_SIZES];
  const maskable = size.startsWith("maskable-");

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
          fontSize: Math.round(pixels * (maskable ? 0.28 : 0.38)),
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        IO
      </div>
    ),
    { width: pixels, height: pixels }
  );
}
