import type { PropsWithChildren } from "react";

import { ThemeProvider } from "./theme/ThemeProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
