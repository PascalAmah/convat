interface BadgeProps {
  status: "active" | "pending" | "closed";
  tags: string[];
}

export function Badge({ status }: BadgeProps) {
  return <span className={`convat-badge convat-badge--${status}`}>{status}</span>;
}
