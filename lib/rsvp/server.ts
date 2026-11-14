import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export type Ticket = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "cancelled";
  checked_in: number[];
  created_at: string;
};

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

let _db: SupabaseClient | null = null;
/** Server-only Supabase client using the service-role key (bypasses RLS). Never import this into a client component. */
export function db() {
  _db ??= createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  return _db;
}

let _resend: Resend | null = null;
export function resend() {
  _resend ??= new Resend(need("RESEND_API_KEY"));
  return _resend;
}

export async function getTicket(code: string): Promise<Ticket | null> {
  const { data, error } = await db().from("tickets").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return (data as Ticket) ?? null;
}

export async function getActiveTicketByEmail(email: string): Promise<Ticket | null> {
  const { data, error } = await db().from("tickets").select("*").ilike("email", email.replace(/([%_\\])/g, "\\$1")).eq("status", "active").maybeSingle();
  if (error) throw error;
  return (data as Ticket) ?? null;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
