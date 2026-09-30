/**
 * Fixture: 04-local-imports.tsx
 * Exercises: relative import chain, in-project resolution (TDD §3.7)
 * Expected status: FULL
 *
 * IMPORTANT: this fixture uses hooks (useState) and is the primary
 * regression guard for React runtime externalization (TDD §3.7 / PRD §1c).
 * It must never throw "Invalid hook call" — see Test Plan §3.
 */

import { useState } from "react";
import { Avatar } from "./support/Avatar";
import { Badge } from "./support/Badge";

interface UserProfileCardProps {
  name: string;
  avatarUrl: string;
  status: "active" | "pending" | "closed";
}

export default function UserProfileCard({
  name,
  avatarUrl,
  status,
}: UserProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="convat-profile-card">
      <Avatar url={avatarUrl} name={name} />
      <h3>{name}</h3>
      <Badge status={status} tags={[]} />
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
