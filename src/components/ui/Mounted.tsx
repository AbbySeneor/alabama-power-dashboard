"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Mounted({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return fallback;
  return children;
}
