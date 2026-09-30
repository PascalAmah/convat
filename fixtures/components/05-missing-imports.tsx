/**
 * Fixture: 05-missing-imports.tsx
 * Exercises: dependency-classifier + dependency-stubber end to end.
 * Same shape as 04-local-imports.tsx, but the import paths are invalidated
 * so they cannot resolve to a real file on disk — this is the canonical
 * "pasted component, missing its siblings" case.
 * Expected status: PARTIAL
 */

import { useState } from "react";
import { Avatar } from "./nonexistent/Avatar";
import { Badge } from "./nonexistent/Badge";

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
