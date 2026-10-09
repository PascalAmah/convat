/**
 * Fixture: 08b-styling-unresolved.tsx
 * Exercises: Error Handling Spec §3.4's SECOND branch — a style import that does
 * NOT resolve, so the component's styling approach "could not be determined at
 * all". This is the styling case that legitimately contributes to PARTIAL.
 *
 * It exists as a sibling of 08-styling.tsx so both halves of §3.4 are covered:
 *   - 08-styling.tsx               (import resolves)     → FULL  — per errata D4-A,
 *     a resolved style import means the approach WAS determined, so the
 *     compatibility baseline applies and there is no downgrade.
 *   - 08b (this file)              (import does not resolve) → PARTIAL
 *
 * Expected status: PARTIAL (undetermined styling, StyleRequirement recorded)
 */

import "./styles/MyMissingPanel.module.css";

interface MissingStyledPanelProps {
  heading: string;
}

export default function MissingStyledPanel({ heading }: MissingStyledPanelProps) {
  return (
    <div className="missingPanel">
      <h2 className="missingPanel__heading">{heading}</h2>
    </div>
  );
}
