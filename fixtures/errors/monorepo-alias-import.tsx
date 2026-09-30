/**
 * Fixture: monorepo-alias-import.tsx
 * Exercises: monorepo/workspace-scoped import resolution — DELIBERATELY
 * expected to remain unresolved in v1.0 (PRD §7 — explicitly OUT OF SCOPE).
 * This is a regression guard confirming the gap stays documented and
 * gracefully degraded (still stubbed via the generic-fallback path) rather
 * than silently half-working or crashing the bundle.
 * Expected status: PARTIAL (via generic-fallback stub, low confidence)
 */

import { Button } from "@myapp/ui/Button";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
}

export default function ConfirmDialog({ message, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="convat-confirm-dialog">
      <p>{message}</p>
      <Button onClick={onConfirm}>Confirm</Button>
    </div>
  );
}
