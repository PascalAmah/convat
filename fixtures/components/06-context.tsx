/**
 * Fixture: 06-context.tsx
 * Exercises: useContext consumer -> provider auto-stub path (context kind,
 * "generic-context" wrapStrategy)
 * Expected status: PARTIAL
 */

import { useContext, createContext } from "react";

interface Theme {
  primaryColor: string;
  mode: "light" | "dark";
}

const ThemeContext = createContext<Theme | null>(null);

interface ThemedCardProps {
  title: string;
}

export default function ThemedCard({ title }: ThemedCardProps) {
  const theme = useContext(ThemeContext);

  return (
    <div
      className="convat-themed-card"
      style={{ color: theme?.primaryColor ?? "inherit" }}
    >
      <h3>{title}</h3>
    </div>
  );
}
