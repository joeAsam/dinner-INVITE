import { content } from "../content";
import { DotPanel } from "./Mockup";

const { agent } = content;

/** Text wrapped in `backticks` in the content file renders as inline code. */
function withCode(text: string) {
  return text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

export function Agent() {
  return (
    <section className="band" id="agent">
      <div className="col">
        <header className="head gutter">
          <h2 className="h2">
            {agent.heading} <span className="h2__dim">{agent.headingDim}</span>
          </h2>
        </header>

        <div className="agent">
          <DotPanel tall>
            <div className="chat" role="img" aria-label={agent.description}>
              <div className="chat__thread" aria-hidden="true">
                <p className="chat__user">{agent.userMessage}</p>
                <p className="chat__text">{withCode(agent.reply)}</p>
                <table className="chat__table">
                  <thead>
                    <tr>
                      {agent.tableHeaders.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agent.tableRows.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="chat__text">{withCode(agent.followUp)}</p>
              </div>

              <div className="logs" aria-hidden="true">
                <p className="logs__title">{agent.logsTitle}</p>
                <p className="logs__meta">{agent.logsSummary}</p>
                <ol className="logs__lines mono">
                  {agent.logLines.map((l, i) => (
                    <li key={i} data-error={l.error || undefined}>
                      <span>{i + 1}</span>
                      {l.text}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </DotPanel>

          <div className="agent__foot gutter">
            <a href={agent.button.href} className="btn btn--primary">
              {agent.button.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
