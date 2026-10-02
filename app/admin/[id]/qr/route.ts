import QRCode from "qrcode";
import { getThreadById } from "@/lib/db";
import { siteUrl } from "@/lib/url";

// Downloadable, print-quality PNG of the thread's QR code.
export async function GET(_req: Request, ctx: RouteContext<"/admin/[id]/qr">) {
  const thread = await getThreadById(Number((await ctx.params).id));
  if (!thread) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`${await siteUrl()}/p/${thread.slug}`, {
    width: 1200,
    margin: 4,
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${thread.slug}.png"`,
    },
  });
}
