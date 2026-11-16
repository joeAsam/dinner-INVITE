"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Home = "/" | "/simple";

const KEY = "ycw:home";

/** Each site (3D at "/", simple at "/simple") calls this on load, so the RSVP and ticket pages know where "home" is. */
export function rememberHome(home: Home) {
  try {
    sessionStorage.setItem(KEY, home);
  } catch {
    // Storage can be blocked (private mode); the links then fall back to the 3D site.
  }
}

/**
 * A link back to whichever site the visitor came from: the 3D site (which skips its intro on the way back)
 * or the simple view. Defaults to the 3D site, e.g. for someone opening a ticket from the email.
 */
export function HomeLink({ className, children }: { className?: string; children: ReactNode }) {
  const [home, setHome] = useState<Home>("/");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "/simple") setHome("/simple");
    } catch {
      // Keep the default.
    }
  }, []);

  // A plain link for the simple view: it is a separate page with its own styles, so it gets a full page load.
  if (home === "/simple") {
    return (
      <a href="/simple" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href="/" className={className}>
      {children}
    </Link>
  );
}
