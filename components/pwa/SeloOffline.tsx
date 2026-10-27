"use client";

import { useEffect, useState } from "react";

export function SeloOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const f = () => setOffline(!navigator.onLine);
    f();
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  if (!offline) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-borda bg-painel px-3 py-1 text-xs font-medium">
      <span className="size-2.5 rounded-full border-2 border-sucesso" /> Offline
    </span>
  );
}
