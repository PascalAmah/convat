/**
 * Demo: a small but realistic dashboard, for trying the CLI by hand.
 * Not part of the fixture suite — it has no expected-status assertion.
 *
 * Run it with:
 *   pnpm run dev -- ./examples/dashboard.tsx --no-open
 *   pnpm run dev -- ./examples/dashboard.tsx --verbose-status --props '{"accent":"rose","title":"Sprint 42"}'
 */

import { useMemo, useState } from "react";

type Accent = "indigo" | "emerald" | "rose";

interface DashboardProps {
  title: string;
  subtitle: string;
  owner: string;
  accent: Accent;
  showProgress: boolean;
}

type Filter = "all" | "open" | "done";

interface Task {
  id: number;
  label: string;
  done: boolean;
}

const INITIAL_TASKS: Task[] = [
  { id: 1, label: "Validate the pasted component", done: true },
  { id: 2, label: "Mock the missing dependencies", done: true },
  { id: 3, label: "Review the coverage panel", done: false },
  { id: 4, label: "Ship the preview link", done: false },
];

const PALETTES: Record<Accent, { strong: string; soft: string }> = {
  indigo: { strong: "#4f46e5", soft: "#eef2ff" },
  emerald: { strong: "#059669", soft: "#ecfdf5" },
  rose: { strong: "#e11d48", soft: "#fff1f2" },
};

export default function Dashboard({
  title,
  subtitle,
  owner,
  accent,
  showProgress,
}: DashboardProps) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [filter, setFilter] = useState<Filter>("all");

  const palette = PALETTES[accent] ?? PALETTES.indigo;
  const visible = useMemo(
    () =>
      tasks.filter((task) =>
        filter === "all" ? true : filter === "done" ? task.done : !task.done
      ),
    [tasks, filter]
  );

  const done = tasks.filter((task) => task.done).length;
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  function toggle(id: number) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        color: "#111827",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 20,
          borderRadius: 16,
          background: palette.soft,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: palette.strong,
            color: "white",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {owner.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
          <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 14 }}>
            {subtitle}
          </p>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: palette.strong,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {owner}
        </span>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <Stat label="Tasks" value={String(tasks.length)} />
        <Stat label="Done" value={String(done)} accent={palette.strong} />
        <Stat label="Open" value={String(tasks.length - done)} />
      </section>

      {showProgress && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#4b5563",
              marginBottom: 6,
            }}
          >
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 10, borderRadius: 999, background: "#e5e7eb" }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                borderRadius: 999,
                background: palette.strong,
                transition: "width 160ms ease",
              }}
            />
          </div>
        </div>
      )}

      <nav style={{ display: "flex", gap: 8, marginTop: 20 }}>
        {(["all", "open", "done"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${filter === value ? palette.strong : "#d1d5db"}`,
              background: filter === value ? palette.soft : "transparent",
              color: filter === value ? palette.strong : "#374151",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {value[0]!.toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>

      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
        {visible.map((task) => (
          <li
            key={task.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              marginBottom: 8,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: task.done ? "#f9fafb" : "white",
            }}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(task.id)}
              style={{ width: 18, height: 18, accentColor: palette.strong }}
            />
            <span
              style={{
                textDecoration: task.done ? "line-through" : "none",
                color: task.done ? "#9ca3af" : "#111827",
              }}
            >
              {task.label}
            </span>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 24 }}>
          Nothing in this view.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "white",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ?? "#111827" }}>
        {value}
      </div>
    </div>
  );
}
