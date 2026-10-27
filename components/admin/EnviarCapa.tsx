"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { enviarArquivo } from "@/lib/enviar-arquivo";
import { definirCapa, prepararUploadCapa, type TipoImagem } from "@/lib/acoes/admin-hqs";
import { Alerta } from "@/components/Alerta";
import { cx } from "@/lib/util";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function EnviarCapa({
  serieId,
  capaUrl,
  personalizada,
  tipo = "capa",
}: {
  serieId: string;
  capaUrl: string | null;
  personalizada: boolean;
  tipo?: TipoImagem;
}) {
  const banner = tipo === "banner";
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function enviar(f: File) {
    setErro("");
    const ext = TIPOS[f.type];
    if (!ext) return setErro("Use JPG, PNG ou WebP.");
    if (f.size > 10 * 1024 * 1024) return setErro("A capa passa de 10 MB.");
    iniciar(async () => {
      const prep = await prepararUploadCapa(serieId, ext, tipo);
      if ("erro" in prep) return setErro(prep.erro ?? "Falha");
      try {
        await enviarArquivo(prep.destino, f);
      } catch (e) {
        return setErro(e instanceof Error ? e.message : "Falha no envio");
      }
      const r = await definirCapa(serieId, prep.destino.caminho, tipo);
      if ("erro" in r) return setErro(r.erro ?? "Falha");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className={cx("relative w-full overflow-hidden rounded-xl bg-superficie", banner ? "aspect-[16/9]" : "aspect-[2/3]")}>
        {capaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capaUrl} alt="Capa" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center p-4 text-center text-xs text-suave">
            {banner ? "Sem banner: o destaque usa a capa" : "A capa sai da 1ª página do 1º capítulo"}
          </div>
        )}
        {pendente && (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <LoaderCircle className="animate-spin" />
          </div>
        )}
      </div>
      <p className="text-xs text-suave">
        {banner
          ? "Banner do destaque (arte larga, ex.: 1600×900)"
          : personalizada
            ? "Capa personalizada"
            : "Capa automática (1ª página)"}
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={pendente} onClick={() => input.current?.click()} className="btn-secundario h-9 flex-1 px-3 text-xs">
          <ImageUp size={14} /> {banner ? "Enviar banner" : "Enviar capa"}
        </button>
        {personalizada && (
          <button
            type="button"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                await definirCapa(serieId, null, tipo);
                router.refresh();
              })
            }
            className="btn-secundario h-9 px-3 text-xs"
            aria-label="Remover"
            title="Remover"
          >
            <Trash2 size={14} />
          </button>
        )}
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
      {erro && <Alerta tipo="erro" titulo={erro} />}
    </div>
  );
}
