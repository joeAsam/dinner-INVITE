import QRCode from "qrcode";
import { isCode } from "@/lib/rsvp/code";
import { ticketUrl } from "@/lib/rsvp/config";

export const runtime = "nodejs";

/**
 * The QR as a PNG, for emails (Gmail won't show inline data: images, so the email links here).
 * It only encodes the public ticket URL, so it doesn't need a database lookup.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = code.replace(/\.png$/, "");
  if (!isCode(c)) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(ticketUrl(c), { type: "png", margin: 1, width: 440, errorCorrectionLevel: "M", color: { dark: "#04060d", light: "#ffffff" } });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
