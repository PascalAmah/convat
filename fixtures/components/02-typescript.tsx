/**
 * Fixture: 02-typescript.tsx
 * Exercises: enum-shaped and array prop types
 * Expected status: FULL
 */

type BadgeStatus = "active" | "pending" | "closed";

interface BadgeProps {
  status: BadgeStatus;
  tags: string[];
}

export default function Badge({ status, tags }: BadgeProps) {
  return (
    <div className={`convat-badge convat-badge--${status}`}>
      <span>{status}</span>
      <ul>
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );
}
