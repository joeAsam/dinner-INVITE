import { RotatingWord } from "./RotatingWord";
import { content } from "../content";
import { landDots } from "../_lib/land";
import { Globe } from "./Globe";
import { Stars } from "./Stars";

// Sampled once per build; the hero is statically rendered.
const DOTS = landDots();

const { hero } = content;

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero__stars" aria-hidden="true">
        <Stars />
      </div>
      <div className="hero__map" aria-hidden="true">
        <div className="hero__map-box">
          <Globe dots={DOTS} />
        </div>
      </div>
      <div className="hero__shade" />

      <div className="hero__body col col--plain gutter">
        <div className="hero__copy">
          <h1 className="hero__title">
            {/* Screen readers get the whole sentence once instead of the morphing word. */}
            <span className="sr-only">
              {hero.titleStart} {hero.rotatingWords.join(", ")} {hero.titleEnd}
            </span>
            <span aria-hidden="true">
              {hero.titleStart}
              <br />
              <RotatingWord words={hero.rotatingWords} />
              <br />
              {hero.titleEnd}
            </span>
          </h1>
          <p className="hero__lead">{hero.lead}</p>
          <div className="hero__actions">
            <a href={hero.primaryButton.href} className="btn btn--primary">
              {hero.primaryButton.label}
            </a>
            <a href={hero.secondaryButton.href} className="btn btn--secondary">
              {hero.secondaryButton.label}
            </a>
          </div>
        </div>
      </div>

      <div className="logos">
        <div className="col logos__row">
          <p className="logos__label mono">{hero.logosLabel}</p>
          {/* Names appear as plain type. The original shows each company's own logo. */}
          <ul className="logos__list">
            {hero.logos.map((c) => (
              <li key={c.name} className={`logos__item logos__item--${c.style}`}>
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
