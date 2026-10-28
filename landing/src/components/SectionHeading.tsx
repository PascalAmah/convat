import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  copy?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"} ${className}`}>
      <span className={`eyebrow ${centered ? "justify-center" : ""}`}>{eyebrow}</span>
      <h2 className="heading-section mt-5 text-paper-50">{title}</h2>
      {copy && (
        <p
          className={`mt-5 max-w-xl text-pretty-copy text-[0.98rem] leading-7 text-paper-400 ${
            centered ? "mx-auto" : ""
          }`}
        >
          {copy}
        </p>
      )}
    </div>
  );
}
