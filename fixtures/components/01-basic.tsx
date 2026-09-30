/**
 * Fixture: 01-basic.tsx
 * Exercises: primitive props only, no imports
 * Expected status: FULL
 */

interface ButtonProps {
  label: string;
  disabled: boolean;
}

export default function Button({ label, disabled }: ButtonProps) {
  return (
    <button disabled={disabled} className="convat-button">
      {label}
    </button>
  );
}
