import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Users } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { carregarAmigos } from "@/lib/amigos";
import { rotuloCapitulo } from "@/lib/rotulos";
import { relativo } from "@/lib/util";
import { Avatar } from "@/components/shell/Topo";

export const metadata: Metadata = { title: "Amigos" };
export const dynamic = "force-dynamic";

export default async function AmigosPage() {
  const { user, perfil } = await exigirLeitor();
  const amigos = await carregarAmigos(user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Amigos</h1>
          <p className="mt-1 text-sm text-suave">O que a galera do portal está lendo.</p>
        </div>
        <Link href="/configuracoes" className="inline-flex items-center gap-2 text-xs text-suave hover:text-texto">
          {perfil.compartilhar_leitura === false ? (
            <>
              <EyeOff size={14} /> Sua leitura está oculta para os amigos
            </>
          ) : (
            <>Você também aparece para eles · mudar</>
          )}
        </Link>
      </header>

      {amigos.length === 0 ? (
        <div className="cartao grid place-items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-primaria">
            <Users size={26} />
          </span>
          <p className="mt-4 font-semibold">Ninguém por aqui ainda</p>
          <p className="mt-1 max-w-sm text-sm text-suave">
            Quando outros leitores entrarem (e deixarem a leitura visível), eles aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {amigos.map((a) => {
            const pct = a.total ? Math.round((Math.min(a.pagina ?? 0, a.total) / a.total) * 100) : 0;
            return (
              <li key={a.id} className="cartao space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar nome={a.nome} url={a.avatarUrl} tamanho={48} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.nome || "Leitor"}</p>
                    <p className="text-xs text-suave">
                      Visto {relativo(a.ultimo_acesso)} · {a.concluidos} capítulo(s) lido(s)
                    </p>
                  </div>
                </div>
                {a.serie_slug ? (
                  <Link href={`/serie/${a.serie_slug}`} className="block space-y-2 rounded-xl bg-fundo p-3 transition hover:bg-superficie">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-suave">
                      {a.terminou ? "Terminou" : "Lendo agora"}
                    </p>
                    <p className="truncate text-sm font-medium">{a.serie_titulo}</p>
                    <p className="text-xs text-suave">
                      {rotuloCapitulo({ numero: a.capitulo_numero ?? "", titulo: a.capitulo_titulo ?? "" })}
                      {!a.terminou && a.total ? ` · página ${a.pagina} de ${a.total}` : ""} · {relativo(a.lido_em)}
                    </p>
                    {!a.terminou && (
                      <div className="h-1 overflow-hidden rounded-full bg-superficie">
                        <div className="h-full rounded-full bg-primaria" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </Link>
                ) : (
                  <p className="rounded-xl bg-fundo p-3 text-sm text-suave">Ainda não começou nenhuma HQ.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
