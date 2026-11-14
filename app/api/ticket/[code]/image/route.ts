import { isCode } from "@/lib/rsvp/code";
import { getTicket } from "@/lib/rsvp/server";
import { renderTicketImage } from "@/lib/rsvp/ticketImage";

export const runtime = "nodejs";

/** The ticket as a PNG. Add ?download=1 to make the browser save it (the email's DOWNLOAD button). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isCode(code)) return new Response("Not found", { status: 404 });
  const t = await getTicket(code);
  if (!t || t.status !== "active") return new Response("Not found", { status: 404 });

  const img = await renderTicketImage(t);
  const download = new URL(req.url).searchParams.has("download");
  return new Response(img.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${t.code}.png"`,
      "Cache-Control": "private, max-age=600",
    },
  });
}
