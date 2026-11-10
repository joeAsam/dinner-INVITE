import { content } from "../content";
import { icons, type IconName } from "./icons";

const { pricing } = content;

export function Pricing() {
  return (
    <section className="band" id="pricing">
      <div className="col">
        <header className="head gutter">
          <h2 className="h2">
            {pricing.heading} <span className="chip">{pricing.headingHighlight}</span>
          </h2>
          <p className="head__sub">{pricing.sub}</p>
        </header>

        <ul className="plans">
          {pricing.plans.map((p) => (
            <li key={p.name} className="plan">
              <div>
                <div className="plan__top">
                  <h3 className="plan__name">{p.name}</h3>
                  {p.popular && <span className="badge mono">{pricing.popularBadge}</span>}
                </div>
                <p className="plan__audience">{p.audience}</p>
              </div>

              <div>
                <p className="plan__price">
                  {p.price}
                  {p.per && <span>{p.per}</span>}
                </p>
                <p className="plan__note">{p.note}</p>
              </div>

              <ul className="plan__features">
                {p.features.map(([icon, text]) => (
                  <li key={text}>
                    {/* An unknown icon name in the content file falls back to the folder icon. */}
                    {icons[icon as IconName] ?? icons.projects}
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <a
                href={p.button.href}
                className={`btn btn--block ${p.popular ? "btn--primary" : "btn--secondary"}`}
              >
                {p.button.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="plans__foot gutter">
          <p>{pricing.footnote}</p>
          <a href={pricing.footnoteLink.href}>
            {pricing.footnoteLink.label} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
