import * as React from "react";
import { icons, type LucideProps } from "lucide-react";

/**
 * Runtime-safe Turkish Lira icon.
 *
 * Some deployments can have a stale Vite prebundle where named exports like
 * `TurkishLira` are missing, which crashes the app at import time.
 * Using the `icons` map avoids that hard failure and falls back gracefully.
 */
export function TurkishLiraIcon(props: LucideProps) {
  const Icon = (icons as unknown as Record<string, React.ComponentType<LucideProps>>)["TurkishLira"]
    ?? (icons as unknown as Record<string, React.ComponentType<LucideProps>>)["Banknote"];

  if (!Icon) return null;
  return <Icon {...props} />;
}
