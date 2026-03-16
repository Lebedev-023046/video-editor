const roadmap = [
  {
    title: "Upload",
    description:
      "Accept many local video files and move them into IndexedDB-backed storage immediately.",
  },
  {
    title: "Order",
    description:
      "Expose a drag-and-drop list so the final concat order stays explicit and editable.",
  },
  {
    title: "Merge",
    description:
      "Run ffmpeg.wasm inside a Web Worker and keep the UI free of long-blocking work.",
  },
];

const stackItems = [
  "React + TypeScript via Vite",
  "Feature-Sliced Design boundaries",
  "SOLID-friendly service contracts",
  "IndexedDB for persisted browser storage",
  "ffmpeg.wasm in a dedicated worker",
];

export function EditorWorkspace() {
  return (
    <div className="editor-page">
      <section className="toolbar">
        <span className="eyebrow">Task 1 foundation</span>
      </section>

      <section className="editor-hero">
        <article className="card hero-card">
          <span className="eyebrow">Minimal browser video editor</span>
          <h1>Merge local clips without leaving the browser.</h1>
          <p>
            The initial scaffold is in place with the app shell, theme system,
            typed video entities, and module boundaries needed for upload,
            reorder, merge, and download features.
          </p>
          <div className="hero-chip-row">
            <span className="chip">Browser-only processing</span>
            <span className="chip">IndexedDB-first storage</span>
            <span className="chip">Worker-ready merge pipeline</span>
          </div>
        </article>

        <aside className="card accent-panel">
          <span className="eyebrow">Current state</span>
          <h2>Ready for feature implementation</h2>
          <p>
            Task 1 establishes the architecture and UI frame. The next tasks
            will replace these foundation panels with the actual editor flow.
          </p>
        </aside>
      </section>

      <section className="stats-grid">
        <article className="card metric-card">
          <strong>FSD</strong>
          <p>Structured into app, pages, widgets, features, entities, and shared layers.</p>
        </article>
        <article className="card metric-card">
          <strong>Themes</strong>
          <p>Light and dark modes are wired with persisted preference storage.</p>
        </article>
        <article className="card metric-card">
          <strong>Typed core</strong>
          <p>Video models already include extension points for future cut ranges.</p>
        </article>
      </section>

      <section className="status-grid">
        <article className="card section-card">
          <span className="eyebrow">Architecture</span>
          <h2>Implementation stack</h2>
          <ul className="stack-list">
            {stackItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card section-card">
          <span className="eyebrow">Status model</span>
          <h2>Planned UI states</h2>
          <div className="hero-chip-row">
            <span className="status-pill">Idle</span>
            <span className="status-pill">Processing</span>
            <span className="status-pill">Success</span>
          </div>
          <p className="meta-copy">
            Error mapping, compatibility messaging, and download handling will
            be added as the feature layers are implemented.
          </p>
        </article>
      </section>

      <section className="card section-card">
        <span className="eyebrow">Roadmap</span>
        <h2>Core flow to build next</h2>
        <div className="roadmap-grid">
          {roadmap.map((step) => (
            <article key={step.title} className="roadmap-step">
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
