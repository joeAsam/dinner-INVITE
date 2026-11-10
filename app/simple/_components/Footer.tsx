import { content } from "../content";

const { footer } = content;

const SOCIAL_ICONS: Record<string, string> = {
  Facebook: "M13.5 21v-7.5H16l.5-3h-3V8.6c0-.9.3-1.6 1.6-1.6h1.5V4.3C16.3 4.2 15.4 4 14.3 4 12 4 10.5 5.4 10.5 8v2.5H8v3h2.5V21z",
  Instagram: "M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm4 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z",
  TikTok: "M14 4v10.5a2.5 2.5 0 1 1-2.5-2.5V9.500a5 5 0 1 0 5 5V9.300c1 .7 2.200 1.2 3.5 1.200V8c-1.900 0-3.500-1.700-3.500-4z",
  X: "M5 4l5.700 7.600L5 20h1.900l4.700-5.200L15.500 20H20l-6-8 5.300-8h-1.900l-4.300 4.800L9.500 4z",
};

export function Footer() {
  // A social network without an icon here is left out rather than shown as an empty box.
  const socials = footer.socials.filter((s) => SOCIAL_ICONS[s.name]);

  return (
    <footer className="foot">
      <div className="foot__inner">
        <div className="foot__about">
          <p className="foot__tagline">{footer.tagline}</p>
          <ul className="foot__socials">
            {socials.map((s) => (
              <li key={s.name}>
                <a href={s.href} aria-label={`${footer.socialLabelPrefix} ${s.name}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" fillRule="evenodd" aria-hidden="true">
                    <path d={SOCIAL_ICONS[s.name]} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <p className="foot__copy">{footer.copyright}</p>
        </div>

        <div className="foot__cols">
          {footer.columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="foot__title">{col.title}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <p className="foot__word" aria-hidden="true">
        {footer.bigWord}
      </p>
    </footer>
  );
}
