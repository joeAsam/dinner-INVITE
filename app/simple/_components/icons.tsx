import type { ReactNode } from "react";
import { content } from "../content";

/** Stand-in wordmark. The original Pxxl mark is not reproduced. */
export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="15" r="8" fill="currentColor" />
        <ellipse cx="16" cy="16" rx="15" ry="5" fill="none" stroke="currentColor" strokeWidth="2.2" transform="rotate(-18 16 16)" />
      </svg>
      <span className="logo__text">
        {content.brand.logoLine1}
        <br />
        {content.brand.logoLine2}
      </span>
    </span>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const icons = {
  projects: (
    <Icon>
      <path d="M1.5 4.5v8h13v-7h-6l-1.5-2h-5.5z" />
    </Icon>
  ),
  database: (
    <Icon>
      <ellipse cx="8" cy="4" rx="5" ry="2" />
      <path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
    </Icon>
  ),
  domain: (
    <Icon>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
    </Icon>
  ),
  memory: (
    <Icon>
      <rect x="2" y="4.5" width="12" height="6" rx="1" />
      <path d="M4.5 10.5v2M8 10.5v2M11.5 10.5v2M5 7h1M8 7h1M11 7h.5" />
    </Icon>
  ),
  bandwidth: (
    <Icon>
      <path d="M2 5.5h11l-2.5-2.5M14 10.5H3l2.5 2.5" />
    </Icon>
  ),
  analytics: (
    <Icon>
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 11V8M8 11V5M11 11V9" />
    </Icon>
  ),
} as const;

export type IconName = keyof typeof icons;
