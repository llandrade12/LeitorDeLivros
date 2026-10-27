"use client";

import { useEffect } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window {
    __geekInstalar?: EventoInstalar | null;
  }
}

/** Registra o service worker e guarda o convite de instalação do Android/Chrome. */
export function RegistrarPwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const guardar = (e: Event) => {
      e.preventDefault();
      window.__geekInstalar = e as EventoInstalar;
      window.dispatchEvent(new Event("geek-pode-instalar"));
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);
  return null;
}
