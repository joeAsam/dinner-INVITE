"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { MusicButton } from "@/components/MusicButton";
import { content } from "../content";
import { Logo } from "./icons";

const { nav, brand } = content;
const LINKS = nav.links;

/**
 * Links to the other view ("/") switch instantly inside the app, so the music keeps playing; on-page links stay plain.
 * scroll={false}: each view puts itself at the top (Next's own scrolling fights the smooth scroll).
 */
function NavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} onClick={onClick} scroll={false}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="nav" data-scrolled={scrolled || open} aria-label="Main">
      <div className="nav__inner">
        <a href="#top" className="nav__logo" aria-label={brand.logoLabel}>
          <Logo />
        </a>

        <ul className="nav__links">
          {LINKS.map((l) => (
            <li key={l.label}>
              <NavLink href={l.href}>{l.label}</NavLink>
            </li>
          ))}
        </ul>

        <div className="nav__end">
          <MusicButton />
          <a href={nav.button.href} className="nav__cta">
            {nav.button.label}
          </a>

          <button
            type="button"
            className="nav__toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? nav.closeMenuLabel : nav.openMenuLabel}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="nav__menu" hidden={!open}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.label}>
              <NavLink href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <a href={nav.button.href} className="btn btn--primary" onClick={() => setOpen(false)}>
          {nav.button.label}
        </a>
      </div>
    </nav>
  );
}
