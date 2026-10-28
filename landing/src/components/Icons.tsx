import type { ReactNode } from "react";

export type IconName =
  | "activity"
  | "alert"
  | "arrow-right"
  | "arrow-up-right"
  | "box"
  | "check"
  | "check-circle"
  | "chevron-down"
  | "code"
  | "copy"
  | "cpu"
  | "external"
  | "eye-off"
  | "file"
  | "file-code"
  | "github"
  | "globe"
  | "info"
  | "layers"
  | "lock"
  | "menu"
  | "package"
  | "play"
  | "refresh"
  | "server"
  | "shield"
  | "sliders"
  | "sparkles"
  | "star"
  | "terminal"
  | "x"
  | "x-circle"
  | "zap";

type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
};

const paths: Record<IconName, ReactNode> = {
  activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
  alert: (
    <>
      <path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  "arrow-up-right": (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  box: (
    <>
      <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" />
      <path d="m4.3 6.7 7.7 4.4 7.7-4.4" />
      <path d="M12 11.1V20" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.7 2.7L16.5 9" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  code: (
    <>
      <path d="m8 7-5 5 5 5" />
      <path d="m16 7 5 5-5 5" />
      <path d="m13.5 4-3 16" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 5.2 9 7 0 .8-.55 1.9-1.55 2.9" />
      <path d="M6.7 6.7C4.1 8.3 3 10.7 3 12c0 1.8 3.5 7 9 7 1.6 0 3-.42 4.2-1.05" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </>
  ),
  "file-code": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="m9.5 12.5-2 2 2 2" />
      <path d="m14.5 12.5 2 2-2 2" />
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .7a11.3 11.3 0 0 0-3.57 22.02c.57.1.78-.24.78-.55v-2.15c-3.18.69-3.85-1.35-3.85-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.65 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.74.11 3.03.74.8 1.18 1.82 1.18 3.07 0 4.39-2.67 5.36-5.22 5.64.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.3 11.3 0 0 0 12 .7Z"
    />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  package: (
    <>
      <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" />
      <path d="m4.3 6.7 7.7 4.4 7.7-4.4" />
      <path d="M12 11.1V20" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7V5Z" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.34 6.34" />
      <path d="M20 4v7h-7" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 4.5 5v6.2c0 4.6 3 8.9 7.5 10.8 4.5-1.9 7.5-6.2 7.5-10.8V5L12 2Z" />
      <path d="m8.7 12 2.2 2.2 4.4-4.4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h7M15 6h5" />
      <circle cx="13" cy="6" r="2" />
      <path d="M4 12h2M10 12h10" />
      <circle cx="8" cy="12" r="2" />
      <path d="M4 18h10M18 18h2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
      <path d="m5 14 .6 1.9 1.9.6-1.9.6L5 19l-.6-1.9-1.9-.6 1.9-.6L5 14Z" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3" />
      <path d="M13 15h4" />
    </>
  ),
  x: <path d="m5 5 14 14M19 5 5 19" />,
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
};

export function Icon({ name, className = "size-5", strokeWidth = 1.7 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
