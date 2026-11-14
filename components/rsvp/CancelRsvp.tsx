"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** "No longer attending?" with an inline confirm step (no browser dialogs). */
export function CancelRsvp({ code }: { code: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function cancel() {
    setStep("busy");
    setErr(null);
    const res = await fetch("/api/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (res.ok) router.refresh();
    else {
      setErr("Couldn’t cancel just now. Please try again.");
      setStep("confirm");
    }
  }

  return (
    <div className="tk-cancel" id="cancel">
      {step === "idle" ? (
        <p>
          No longer attending?{" "}
          <button type="button" className="tk-link" onClick={() => setStep("confirm")}>
            Un-RSVP
          </button>
        </p>
      ) : (
        <div className="tk-confirm">
          <p>Cancel your ticket? Your QR code will stop working and the reminders will stop.</p>
          <div>
            <button type="button" className="tk-btn tk-btn-ghost" onClick={() => setStep("idle")} disabled={step === "busy"}>
              Keep my ticket
            </button>
            <button type="button" className="tk-btn tk-btn-danger" onClick={cancel} disabled={step === "busy"}>
              {step === "busy" ? "Cancelling…" : "Yes, cancel it"}
            </button>
          </div>
          {err && <p className="tk-error">{err}</p>}
        </div>
      )}
    </div>
  );
}
