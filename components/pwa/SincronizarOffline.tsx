"use client";

import { useEffect } from "react";
import { conferirBaixados, salvarProgresso } from "@/lib/acoes/leitor";
import { limparPendente, listarBaixados, listarPendentes, removerBaixado, salvarBaixado, suportaOffline, VALIDADE_DIAS } from "@/lib/offline";

/** Com internet: envia o progresso feito offline, renova a validade dos
 *  downloads e apaga do aparelho o que o leitor perdeu acesso. */
export function SincronizarOffline() {
  useEffect(() => {
    if (!suportaOffline()) return;
    let rodando = false;

    async function sincronizar() {
      if (rodando || !navigator.onLine) return;
      rodando = true;
      try {
        for (const p of await listarPendentes()) {
          try {
            const r = await salvarProgresso(p.capituloId, p.pagina, p.total);
            if (!("erro" in r)) await limparPendente(p.capituloId);
          } catch {
            break; // sem conexão de verdade; tenta depois
          }
        }
        const baixados = await listarBaixados();
        if (baixados.length) {
          const r = await conferirBaixados(baixados.map((c) => c.id));
          if (!r.sessao) return; // deslogado: não apaga nada por engano
          const ok = new Set(r.permitidos);
          for (const c of baixados) {
            if (!ok.has(c.id)) await removerBaixado(c.id);
            else await salvarBaixado({ ...c, expiraEm: Date.now() + VALIDADE_DIAS * 864e5 });
          }
        }
      } catch {
        /* tenta na próxima */
      } finally {
        rodando = false;
      }
    }

    sincronizar();
    window.addEventListener("online", sincronizar);
    return () => window.removeEventListener("online", sincronizar);
  }, []);
  return null;
}
