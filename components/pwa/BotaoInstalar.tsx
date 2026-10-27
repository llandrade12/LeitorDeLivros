"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";

export function BotaoInstalar() {
  const [pode, setPode] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    setInstalado(window.matchMedia("(display-mode: standalone)").matches);
    setPode(Boolean(window.__geekInstalar));
    const f = () => setPode(true);
    const ok = () => setInstalado(true);
    window.addEventListener("geek-pode-instalar", f);
    window.addEventListener("appinstalled", ok);
    return () => {
      window.removeEventListener("geek-pode-instalar", f);
      window.removeEventListener("appinstalled", ok);
    };
  }, []);

  if (instalado) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-sucesso/10 p-3 text-sm text-sucesso">
        <CheckCircle2 size={16} /> O GEEK já está instalado neste aparelho.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={!pode}
      onClick={async () => {
        const ev = window.__geekInstalar;
        if (!ev) return;
        await ev.prompt();
        const r = await ev.userChoice;
        if (r.outcome === "accepted") setInstalado(true);
        window.__geekInstalar = null;
        setPode(false);
      }}
      className="btn-primario w-full"
      title={pode ? undefined : "Abra pelo Chrome no Android, ou use o menu ⋮ → Instalar app"}
    >
      <Download size={16} /> Instalar GEEK
    </button>
  );
}
