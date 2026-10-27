"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { definirAvatar, prepararUploadAvatar, salvarPerfil, trocarSenha } from "@/lib/acoes/perfil";
import { enviarArquivo } from "@/lib/enviar-arquivo";
import { Alerta } from "@/components/Alerta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { Avatar } from "@/components/shell/Topo";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function EnviarAvatar({ nome, url }: { nome: string; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function enviar(f: File) {
    setErro("");
    const ext = TIPOS[f.type];
    if (!ext) return setErro("Use JPG, PNG ou WebP.");
    if (f.size > 5 * 1024 * 1024) return setErro("A foto passa de 5 MB.");
    iniciar(async () => {
      const prep = await prepararUploadAvatar(ext);
      if ("erro" in prep) return setErro(prep.erro ?? "Falha");
      try {
        await enviarArquivo(prep.destino, f);
      } catch (e) {
        return setErro(e instanceof Error ? e.message : "Falha no envio");
      }
      const r = await definirAvatar(prep.destino.caminho);
      if ("erro" in r) return setErro(r.erro ?? "Falha");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar nome={nome} url={url} tamanho={80} />
        {pendente && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60">
            <LoaderCircle className="animate-spin" />
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button type="button" disabled={pendente} onClick={() => input.current?.click()} className="btn-secundario h-9 px-3 text-xs">
            <Camera size={14} /> Trocar foto
          </button>
          {url && (
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await definirAvatar(null);
                  router.refresh();
                })
              }
              className="btn-secundario h-9 w-9 px-0"
              aria-label="Remover foto"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="text-xs text-suave">JPG, PNG ou WebP, até 5 MB.</p>
        {erro && <Alerta tipo="erro" titulo={erro} />}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function FormPerfil({ nome, compartilhar }: { nome: string; compartilhar: boolean }) {
  const [estado, acao] = useActionState(salvarPerfil, {});
  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      {estado.ok && <Alerta tipo="ok" titulo={estado.ok} />}
      <div>
        <label className="rotulo" htmlFor="nome">Nome</label>
        <div className="campo">
          <input id="nome" name="nome" defaultValue={nome} required maxLength={60} />
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-borda p-4">
        <span>
          <span className="block text-sm font-medium">Mostrar minha leitura para os amigos</span>
          <span className="block text-xs text-suave">Aparece em &quot;Amigos&quot; o que você está lendo e quantos capítulos terminou.</span>
        </span>
        <input type="checkbox" name="compartilhar" defaultChecked={compartilhar} className="peer sr-only" />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-superficie transition peer-checked:bg-primaria after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>
      <BotaoEnviar seta={false} className="sm:w-auto">Salvar perfil</BotaoEnviar>
    </form>
  );
}

export function FormTrocarSenha() {
  const [estado, acao] = useActionState(trocarSenha, {});
  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <Alerta tipo="erro" titulo={estado.erro} />}
      {estado.ok && <Alerta tipo="ok" titulo={estado.ok} />}
      <CampoSenha name="senha" placeholder="Nova senha" autoComplete="new-password" mostrarForca />
      <CampoSenha name="confirmar" placeholder="Confirmar senha" autoComplete="new-password" />
      <BotaoEnviar seta={false} className="sm:w-auto">Trocar senha</BotaoEnviar>
    </form>
  );
}
