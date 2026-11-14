import "server-only";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { dayLabel, event, weekRange } from "@/lib/content";
import { dayColor } from "./calendar";
import { ticketUrl } from "./config";

export const TICKET_W = 1000;
export const TICKET_H = 1500;

const NIGHT = "#04060d";
const CREAM = "#fff4e6";
const DIM = "#ffeedca8";
const EMBER = "#f26f21";

/** The downloadable / attachable ticket: a phone-sized PNG with the guest's name, code, QR and the five days. */
export async function renderTicketImage(t: { code: string; name: string }) {
  const qr = await QRCode.toDataURL(ticketUrl(t.code), { margin: 1, width: 520, errorCorrectionLevel: "M", color: { dark: NIGHT, light: "#ffffff" } });
  const yy = `’${String(event.year).slice(-2)}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", padding: 50, background: NIGHT }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 44,
            overflow: "hidden",
            border: "2px solid #ffd6aa30",
            backgroundImage: `radial-gradient(circle at 85% -10%, #f26f2166 0%, transparent 45%), radial-gradient(circle at 0% 110%, #7aa7ff33 0%, transparent 45%), linear-gradient(180deg, #0d1020 0%, #090b15 100%)`,
          }}
        >
          {/* Top: brand + name */}
          <div style={{ display: "flex", flexDirection: "column", padding: "56px 60px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: CREAM, fontWeight: 700 }}>
                YOUTH CHOIR WEEK&nbsp;<span style={{ color: EMBER }}>{yy}</span>
              </div>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: NIGHT, background: CREAM, borderRadius: 999, padding: "8px 20px" }}>ADMIT ONE</div>
            </div>
            <div style={{ display: "flex", marginTop: 54, fontSize: 24, letterSpacing: 5, color: DIM }}>WEEK PASS · ALL FIVE DAYS</div>
            <div style={{ display: "flex", marginTop: 12, fontSize: t.name.length > 22 ? 64 : 84, lineHeight: 1.02, color: CREAM, fontWeight: 700 }}>{t.name}</div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: DIM }}>
              {weekRange()} · {event.city}, {event.state}
            </div>
          </div>

          {/* Perforation */}
          <div style={{ display: "flex", alignItems: "center", position: "relative", height: 40 }}>
            <div style={{ display: "flex", position: "absolute", left: -22, width: 44, height: 44, borderRadius: 999, background: NIGHT }} />
            <div style={{ display: "flex", flex: 1, margin: "0 44px", borderTop: "4px dashed #ffd6aa38" }} />
            <div style={{ display: "flex", position: "absolute", right: -22, width: 44, height: 44, borderRadius: 999, background: NIGHT }} />
          </div>

          {/* QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 60px 0" }}>
            <div style={{ display: "flex", padding: 22, borderRadius: 32, background: "#ffffff" }}>
              <img src={qr} width={420} height={420} alt="" />
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 40, letterSpacing: 8, color: CREAM, fontWeight: 700 }}>{t.code}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 24, color: DIM }}>Show this at check-in, every day</div>
          </div>

          {/* Days */}
          <div style={{ display: "flex", gap: 14, padding: "44px 50px 0", marginTop: "auto", marginBottom: 54 }}>
            {event.days.map((d) => (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", flex: 1, borderRadius: 22, padding: "18px 14px", background: "#ffffff0d", borderTop: `8px solid ${dayColor(d)}` }}>
                <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: dayColor(d), fontWeight: 700 }}>DAY {d.day}</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 25, color: CREAM, fontWeight: 700 }}>{d.verb}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 19, color: DIM }}>{dayLabel(d.date)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: TICKET_W, height: TICKET_H },
  );
}
