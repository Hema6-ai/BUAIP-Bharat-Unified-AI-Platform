// app/components/AIBadge.tsx
"use client";

interface AIBadgeProps {
  variant?: "default" | "compact" | "large";
  className?: string;
}

export function AIBadge({ variant = "default", className = "" }: AIBadgeProps) {
  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200 ${className}`}
      >
        🤖 AI
      </span>
    );
  }

  if (variant === "large") {
    return (
      <span
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-base font-bold rounded-full border-2 border-purple-300 shadow-sm ${className}`}
      >
        <span className="text-xl">🤖</span>
        AI Generated Insight
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 ${className}`}
    >
      🤖 AI Generated
    </span>
  );
}
