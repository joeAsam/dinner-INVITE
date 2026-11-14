-- Youth Choir Week tickets. Run this once in Supabase → SQL Editor.
-- The site talks to these tables with the service-role key from the server only,
-- so row level security is on with no public policies (nobody can read them from the browser).

create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,              -- YCW26-K7MQ-3XPA, encoded in the QR
  name        text not null,
  email       text not null,
  phone       text,
  status      text not null default 'active' check (status in ('active', 'cancelled')),
  checked_in  int[] not null default '{}',        -- day numbers scanned at the door (for later)
  created_at  timestamptz not null default now()
);

-- One active ticket per email address. RSVPing again just re-sends the same ticket.
create unique index if not exists tickets_one_active_per_email on public.tickets (lower(email)) where status = 'active';

create table if not exists public.reminders (
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  day         int  not null check (day between 1 and 5),
  send_at     timestamptz not null,
  resend_id   text,                               -- Resend email id, used to cancel if the guest un-RSVPs
  created_at  timestamptz not null default now(),
  primary key (ticket_id, day)
);

alter table public.tickets   enable row level security;
alter table public.reminders enable row level security;
