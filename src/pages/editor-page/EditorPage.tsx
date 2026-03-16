import { ThemeToggle } from "../../shared/ui/theme-toggle/ThemeToggle";
import { EditorWorkspace } from "../../widgets/editor-workspace";

export function EditorPage() {
  return (
    <main className="app-shell">
      <div className="editor-page">
        <section className="toolbar">
          <div>
            <span className="eyebrow">Video editor</span>
          </div>
          <ThemeToggle />
        </section>
      </div>
      <EditorWorkspace />
    </main>
  );
}
