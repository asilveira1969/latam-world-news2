"use client";

import { useEffect } from "react";

const STORAGE_KEY = "latam-view-tracker";
const THROTTLE_MS = 5 * 60 * 1000;

export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const now = Date.now();
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const lastSeen = parsed[slug] ?? 0;
    if (now - lastSeen < THROTTLE_MS) {
      return;
    }

    parsed[slug] = now;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

    void fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug })
    });
  }, [slug]);

  return null;
}
