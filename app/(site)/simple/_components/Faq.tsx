import { content } from "../content";

const { faq } = content;

export function Faq() {
  return (
    <section className="band" id="faq">
      <h2 className="sr-only">{faq.heading}</h2>
      <ul className="col faq">
        {faq.items.map((item) => (
          <li key={item.q} className="faq__item">
            <details>
              <summary className="faq__q gutter">
                {item.q}
                <span className="faq__mark" aria-hidden="true" />
              </summary>
              <p className="faq__a gutter">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
