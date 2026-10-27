import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/tipos";
import { cx, dataHora } from "@/lib/util";
import { FormNovoLeitor } from "./FormNovoLeitor";
import { AcoesLeitor } from "./AcoesLeitor";

export const metadata: Metadata = { title: "Leitores" };
export const dynamic = "force-dynamic";

type Situacao = "ativo" | "desativado" | "convite" | "senha";

export default async function LeitoresPage() {
  const { user } = await exigirAdmin();
  const admin = createAdminClient();

  const [{ data: perfis }, { data: contas }] = await Promise.all([
    admin.from("profiles").select("*").order("criado_em", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const porId = new Map((contas?.users ?? []).map((u) => [u.id, u]));

  const leitores = ((perfis ?? []) as Perfil[]).map((p) => {
    const conta = porId.get(p.id);
    const conviteNaoAceito = Boolean(conta?.invited_at) && !conta?.last_sign_in_at;
    const situacao: Situacao = !p.ativo
      ? "desativado"
      : conviteNaoAceito
        ? "convite"
        : p.precisa_trocar_senha
          ? "senha"
          : "ativo";
    return {
      ...p,
      email: conta?.email ?? "—",
      ultimoLogin: conta?.last_sign_in_at ?? null,
      situacao,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Leitores</h1>
        <p className="mt-1 text-sm text-suave">
          Só quem você cadastra aqui consegue entrar. {leitores.length} conta(s).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
        <FormNovoLeitor />

        <section className="cartao divide-y divide-borda/60">
          {leitores.length === 0 && <p className="p-6 text-sm text-suave">Nenhuma conta ainda.</p>}
          {leitores.map((l) => (
            <article key={l.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-sm font-bold">
                  {(l.nome || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {l.nome || "Sem nome"}
                    {l.role === "admin" && (
                      <span className="ml-2 rounded-md bg-roxo/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-roxo">
                        admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-suave">{l.email}</p>
                </div>
                <Selo situacao={l.situacao} />
              </div>
              <p className="text-xs text-suave">
                Criado em {dataHora(l.criado_em)} · Último login {dataHora(l.ultimoLogin)}
              </p>
              <AcoesLeitor id={l.id} nome={l.nome || l.email} ativo={l.ativo} ehVoce={l.id === user.id} />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function Selo({ situacao }: { situacao: Situacao }) {
  const mapa: Record<Situacao, [string, string]> = {
    ativo: ["Ativo", "bg-sucesso/15 text-sucesso"],
    desativado: ["Desativado", "bg-perigo/15 text-perigo"],
    convite: ["Convite pendente", "bg-alerta/15 text-alerta"],
    senha: ["Aguardando 1º acesso", "bg-primaria/15 text-primaria"],
  };
  const [texto, classe] = mapa[situacao];
  return <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", classe)}>{texto}</span>;
}
