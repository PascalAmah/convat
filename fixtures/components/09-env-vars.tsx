/**
 * Fixture: 09-env-vars.tsx
 * Exercises: process.env usage -> RESOLVED severity mitigation
 * (mock env values injected via esbuild define dictionary)
 * Expected status: FULL — env stubbing does not push status to PARTIAL,
 * per Test Plan §3 note.
 */

interface FeatureBannerProps {
  message: string;
}

export default function FeatureBanner({ message }: FeatureBannerProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "unknown";

  return (
    <div className="convat-feature-banner">
      <p>{message}</p>
      <small>API: {apiBase}</small>
    </div>
  );
}
