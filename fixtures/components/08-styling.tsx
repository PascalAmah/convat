/**
 * Fixture: 08-styling.tsx
 * Exercises: custom CSS/Sass import -> style requirement approximation
 * path (PRD §1d — project-specific styling is not reproduced)
 * Expected status: PARTIAL
 */

import "./styles/StyledPanel.module.scss";

interface StyledPanelProps {
  heading: string;
}

export default function StyledPanel({ heading }: StyledPanelProps) {
  return (
    <div className="styledPanel">
      <h2 className="styledPanel__heading">{heading}</h2>
    </div>
  );
}
