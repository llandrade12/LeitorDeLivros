"use client";

import { useActionState, useState } from "react";
import { salvarSerie } from "@/lib/acoes/admin-hqs";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import type { Serie } from "@/lib/tipos";
import { cx } from "@/lib/util";

type Leitor = { id: string; nome: string };

export function FormSerie({
  serie,
  leitores,
  liberados = [],
}: {
  serie?: Serie;
  leitores: Leitor[];
  liberados?: string[];
}) {
  const [estado, acao] = useActionState(salvarSerie, {});
  const [acesso, setAcesso] = useState(serie?.acesso ?? "todos");

  return (
    <form action={acao} className="cartao space-y-5 p-5">
      {serie && <input type="hidden" name="id" value={serie.id} />}
      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      {estado.ok && <Alerta tipo="ok" titulo={estado.ok} />}

      <div>
        <label className="rotulo" htmlFor="titulo">Título</label>
        <div className="campo">
          <input id="titulo" name="titulo" defaultValue={serie?.titulo} required placeholder="Nome da HQ" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="autor">Autor(es)</label>
          <div className="campo">
            <input id="autor" name="autor" defaultValue={serie?.autor} placeholder="Seu nome ou equipe" />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="chamada">Chamada do destaque</label>
          <div className="campo">
            <input id="chamada" name="chamada" defaultValue={serie?.chamada} maxLength={160} placeholder="Num mundo à beira do fim…" />
          </div>
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="sinopse">Sinopse</label>
        <textarea
          id="sinopse"
          name="sinopse"
          defaultValue={serie?.sinopse}
          rows={5}
          placeholder="Do que se trata a história…"
          className="w-full rounded-xl border border-borda bg-painel p-4 text-sm outline-none placeholder:text-suave focus:border-primaria"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="status">Status</label>
          <div className="campo">
            <select id="status" name="status" defaultValue={serie?.status ?? "em_andamento"} className="bg-painel">
              <option value="em_andamento">Em andamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="hiato">Hiato</option>
            </select>
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="ordem">Ordem na biblioteca</label>
          <div className="campo">
            <input id="ordem" name="ordem" type="number" defaultValue={serie?.ordem ?? 0} />
          </div>
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="tags">Tags (separe por vírgula)</label>
        <div className="campo">
          <input id="tags" name="tags" defaultValue={serie?.tags.join(", ")} placeholder="ação, fantasia, curta" />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="rotulo">Quem pode ler</legend>
        <input type="hidden" name="acesso" value={acesso} />
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-fundo p-1">
          {(
            [
              ["todos", "Todos os leitores"],
              ["restrito", "Só os escolhidos"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              type="button"
              aria-pressed={acesso === v}
              onClick={() => setAcesso(v)}
              className={cx(
                "h-9 rounded-lg text-sm transition",
                acesso === v ? "bg-superficie font-medium" : "text-suave hover:text-texto",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {acesso === "restrito" && (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-borda p-2">
            {leitores.length === 0 && <p className="p-2 text-sm text-suave">Nenhum leitor cadastrado ainda.</p>}
            {leitores.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-superficie">
                <input
                  type="checkbox"
                  name="leitores"
                  value={l.id}
                  defaultChecked={liberados.includes(l.id)}
                  className="size-4 accent-primaria"
                />
                {l.nome || "Sem nome"}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-borda p-4">
        <span>
          <span className="block text-sm font-medium">Publicada</span>
          <span className="block text-xs text-suave">Desligado = rascunho, só você vê.</span>
        </span>
        <input type="checkbox" name="publicado" defaultChecked={serie?.publicado ?? false} className="peer sr-only" />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-superficie transition peer-checked:bg-primaria after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-borda p-4">
        <span>
          <span className="block text-sm font-medium">Mostrar em &quot;Em breve&quot;</span>
          <span className="block text-xs text-suave">Enquanto não estiver publicada, os leitores veem só a capa, a sinopse e a data.</span>
        </span>
        <input type="checkbox" name="em_breve" defaultChecked={serie?.em_breve ?? false} className="peer sr-only" />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-superficie transition peer-checked:bg-primaria after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>
      <div>
        <label className="rotulo" htmlFor="lancamento_em">Data prevista de lançamento (opcional)</label>
        <div className="campo">
          <input id="lancamento_em" name="lancamento_em" type="date" defaultValue={serie?.lancamento_em ?? ""} className="[color-scheme:dark]" />
        </div>
      </div>

      <BotaoEnviar seta={false}>{serie ? "Salvar alterações" : "Criar HQ"}</BotaoEnviar>
    </form>
  );
}
