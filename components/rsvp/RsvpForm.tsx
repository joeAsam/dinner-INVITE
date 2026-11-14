"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RsvpForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(f)) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.code) throw new Error(json.error || "Something went wrong. Please try again.");
      const q = new URLSearchParams({ welcome: json.existing ? "again" : "new" });
      if (json.emailed === false) q.set("mail", "failed");
      router.push(`/ticket/${json.code}?${q}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="tk-form" onSubmit={onSubmit} noValidate={false}>
      <label className="tk-field">
        <span>Full name</span>
        <input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="As it should appear on your ticket" />
      </label>
      <label className="tk-field">
        <span>Email</span>
        <input name="email" type="email" required maxLength={160} autoComplete="email" inputMode="email" placeholder="We’ll send your ticket here" />
      </label>
      <label className="tk-field">
        <span>
          Phone <em>optional</em>
        </span>
        <input name="phone" type="tel" maxLength={30} autoComplete="tel" inputMode="tel" placeholder="080…" />
      </label>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input className="tk-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {err && (
        <p className="tk-error" role="alert">
          {err}
        </p>
      )}
      <button className="tk-btn tk-btn-ember" type="submit" disabled={busy}>
        {busy ? "Making your ticket…" : "Get my ticket"}
      </button>
      <p className="tk-fine">One ticket covers all five days. We’ll email it to you, plus a reminder 2 hours before each day.</p>
    </form>
  );
}
