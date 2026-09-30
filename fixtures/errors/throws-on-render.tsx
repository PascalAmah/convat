/**
 * Fixture: throws-on-render.tsx
 * Exercises: RuntimeErrorReport path (Error Handling Spec §3.5) — bundle
 * succeeds, but the component throws during React render because it
 * destructures a required field from context that the generic-context stub
 * does not supply.
 * Expected: server stays running, Error Boundary shown in-browser, coverage
 * panel remains visible alongside the error.
 */

import { useContext, createContext } from "react";

interface AuthState {
  user: {
    name: string;
    permissions: string[];
  };
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export default function AdminPanel() {
  const auth = useContext(AuthContext);

  // Unconditional destructure of a required field the generic stub can't
  // safely guess — this is expected to throw at render time, not at bundle time.
  const { user } = auth as AuthState;

  return (
    <div className="convat-admin-panel">
      <h2>Welcome, {user.name}</h2>
      <ul>
        {user.permissions.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
