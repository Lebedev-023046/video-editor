import { AppProviders } from "./providers/AppProviders";
import { EditorPage } from "../pages/editor-page/EditorPage";

export function App() {
  return (
    <AppProviders>
      <EditorPage />
    </AppProviders>
  );
}
