import type { ReactNode } from "react";

export type Option = { name: string; desc: string };

/** Dot-grid panel with a product window that bleeds off the right and bottom edges. */
export function DotPanel({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return (
    <div className={tall ? "dots dots--tall" : "dots"}>
      <div className="window">{children}</div>
    </div>
  );
}

/** A setup-wizard step: ring, "Step n of m · Title", hint and a two-column option grid. */
export function StepMockup({
  step,
  title,
  hint,
  options,
}: {
  step: string;
  title: string;
  hint: string;
  options: Option[];
}) {
  return (
    <div className="step" role="img" aria-label={`${title}: ${options.map((o) => o.name).join(", ")}`}>
      <div className="step__rail" aria-hidden="true">
        <span className="step__ring" />
        <span className="step__line" />
      </div>
      <div className="step__main" aria-hidden="true">
        <p className="step__title">
          <span>{step}</span> · {title}
        </p>
        <p className="step__hint">{hint}</p>
        <ul className="options">
          {options.map((o) => (
            <li key={o.name} className="option">
              <span className="option__tile">{o.name.slice(0, 2)}</span>
              <span className="option__text">
                <span className="option__name">{o.name}</span>
                <span className="option__desc">{o.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
