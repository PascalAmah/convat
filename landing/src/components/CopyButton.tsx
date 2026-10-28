import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
};

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
  iconOnly = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy(value);
      }
      setCopied(true);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? copiedLabel : label}
    >
      <Icon name={copied ? "check" : "copy"} className="size-3.5" />
      {iconOnly ? (
        <span className="sr-only">{copied ? copiedLabel : label}</span>
      ) : (
        <span aria-live="polite">{copied ? copiedLabel : label}</span>
      )}
    </button>
  );
}
