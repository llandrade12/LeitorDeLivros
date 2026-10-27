import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Users } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rotuloCapitulo } from "@/lib/rotulos";
import type { Perfil } from "@/lib/tipos";
import { cx, relativo } from "@/lib/util";

export const metadata: Metadata = { title: "Estatísticas" };
export const dynamic = "force-dynamic";

type Linha = {
  user_id: string;
  chapter_id: string;
  ultima_pagina: number;
  concluido: boolean;
  atualizado_em: string;
  chapters: {
    numero: string;
    titulo: string;
    total_paginas: number;
    series: { titulo: string; slug: string } | null;
  } | null;
};

export default async function EstatisticasPage() {
  await exigirAdmin();
  const db = createAdminClient();
  const [{ data: perfis }, { data: prog }, { count: nSeries }, { count: nCaps }, { data: contas }] = await Promise.all([
    db.from("profiles").select("*"),
    db
      .from("reading_progress")
      .select("user_id,chapter_id,ultima_pagina,concluido,atualizado_em,chapters(numero,titulo,total_paginas,series(titulo,slug))")
      .order("atualizado_em", { ascending: false })
      .limit(500),
    db.from("series").select("id", { count: "exact", head: true }).eq("publicado", true),
    db.from("chapters").select("id", { count: "exact", head: true }).eq("publicado", true).gt("total_paginas", 0),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const leitores = ((perfis ?? []) as Perfil[]).filter((p) => p.role === "leitor");
  const nomes = new Map(((perfis ?? []) as Perfil[]).map((p) => [p.id, p.nome || "Sem nome"]));
  const login = new Map((contas?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  const linhas = (prog ?? []) as unknown as Linha[];

  const ultimoAcesso = (id: string, p?: Perfil) => {
    const a = p?.ultimo_acesso ?? null;
    const b = login.get(id) ?? null;
    return !a ? b : !b ? a : a > b ? a : b;
  };
  const ativos7d = leitores.filter((p) => {
    const u = ultimoAcesso(p.id, p);
    return u && Date.now() - new Date(u).getTime() < 7 * 864e5;
  }).length;
  const concluidos = linhas.filter((l) => l.concluido).length;

  const porLeitor = leitores
    .map((p) => ({
      perfil: p,
      acesso: ultimoAcesso(p.id, p),
      leituras: linhas.filter((l) => l.user_id === p.id),
    }))
    .sort((a, b) => (b.acesso ?? "").localeCompare(a.acesso ?? ""));

  const cartoes = [
    { icone: Users, rotulo: "Leitores", valor: leitores.length, extra: `${ativos7d} ativos nos últimos 7 dias` },
    { icone: BookOpen, rotulo: "HQs publicadas", valor: nSeries ?? 0, extra: `${nCaps ?? 0} capítulos` },
    { icone: Clock, rotulo: "Leituras registradas", valor: linhas.length, extra: "capítulos abertos" },
    { icone: CheckCircle2, rotulo: "Capítulos concluídos", valor: concluidos, extra: "somando todos os leitores" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Estatísticas</h1>
        <p className="mt-1 text-sm text-suave">Quem está lendo o quê, em que página e quando entrou pela última vez.</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cartoes.map(({ icone: Icone, rotulo, valor, extra }) => (
          <li key={rotulo} className="cartao space-y-3 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-primaria/15 text-primaria">
              <Icone size={20} />
            </span>
            <p className="text-3xl font-bold tabular-nums">{valor}</p>
            <div>
              <p className="text-sm font-medium">{rotulo}</p>
              <p className="text-xs text-suave">{extra}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Leitores</h2>
        {porLeitor.length === 0 && <p className="cartao p-6 text-sm text-suave">Nenhum leitor cadastrado ainda.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {porLeitor.map(({ perfil, acesso, leituras }) => {
            const lendo = leituras.filter((l) => !l.concluido);
            return (
              <article key={perfil.id} className="cartao space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primaria to-roxo font-bold text-white">
                    {(perfil.nome || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {perfil.nome || "Sem nome"}
                      {!perfil.ativo && <span className="ml-2 text-xs text-perigo">desativado</span>}
                    </p>
                    <p className="text-xs text-suave">
                      Último acesso: {relativo(acesso)} · {leituras.filter((l) => l.concluido).length} concluído(s)
                    </p>
                  </div>
                </div>
                {lendo.length === 0 ? (
                  <p className="text-sm text-suave">Nada em leitura no momento.</p>
                ) : (
                  <ul className="space-y-2">
                    {lendo.slice(0, 4).map((l) => {
                      const total = l.chapters?.total_paginas ?? 0;
                      const pct = total ? Math.round((Math.min(l.ultima_pagina, total) / total) * 100) : 0;
                      return (
                        <li key={l.chapter_id} className="space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="truncate">
                              {l.chapters?.series?.titulo ?? "—"} · {l.chapters ? rotuloCapitulo(l.chapters) : ""}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-suave">
                              pág. {l.ultima_pagina}/{total}
                            </span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-superficie">
                            <div className="h-full rounded-full bg-primaria" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Atividade recente</h2>
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-suave">
              <tr className="border-b border-borda/60">
                <th className="px-4 py-3 font-medium">Leitor</th>
                <th className="px-4 py-3 font-medium">HQ / capítulo</th>
                <th className="px-4 py-3 font-medium">Página</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda/40">
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-suave">
                    Ninguém leu nada ainda.
                  </td>
                </tr>
              )}
              {linhas.slice(0, 100).map((l) => (
                <tr key={`${l.user_id}-${l.chapter_id}`}>
                  <td className="px-4 py-3">{nomes.get(l.user_id) ?? "—"}</td>
                  <td className="px-4 py-3">
                    {l.chapters?.series ? (
                      <Link href={`/serie/${l.chapters.series.slug}`} className="hover:text-primaria">
                        {l.chapters.series.titulo}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <span className="text-suave"> · {l.chapters ? rotuloCapitulo(l.chapters) : ""}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {l.ultima_pagina}/{l.chapters?.total_paginas ?? "?"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        l.concluido ? "bg-sucesso/15 text-sucesso" : "bg-primaria/15 text-primaria",
                      )}
                    >
                      {l.concluido ? "Concluído" : "Lendo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-suave">{relativo(l.atualizado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
