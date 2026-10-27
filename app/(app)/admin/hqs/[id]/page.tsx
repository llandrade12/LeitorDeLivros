import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, UploadCloud } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assinar, EXPIRA_CAPA_S } from "@/lib/storage";
import type { Capitulo, Serie } from "@/lib/tipos";
import { Alerta } from "@/components/Alerta";
import { FormSerie } from "@/components/admin/FormSerie";
import { EnviarCapa } from "@/components/admin/EnviarCapa";
import { ExcluirSerie } from "@/components/admin/ExcluirSerie";
import { ListaCapitulos } from "@/components/admin/ListaCapitulos";
import { GerenciarHerois } from "@/components/admin/GerenciarHerois";
import type { Personagem } from "@/lib/tipos";

export const metadata: Metadata = { title: "Editar HQ" };
export const dynamic = "force-dynamic";

export default async function EditarHqPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  await exigirAdmin();
  const { id } = await params;
  const { nova } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createAdminClient();
  const [{ data: s }, { data: c }, { data: acesso }, { data: leitores }, { data: prog }, { data: pers }, { data: vinc }, { data: todasSeries }] = await Promise.all([
    db.from("series").select("*").eq("id", id).maybeSingle(),
    db.from("chapters").select("*").eq("series_id", id).order("ordem").order("criado_em"),
    db.from("series_access").select("user_id").eq("series_id", id),
    db.from("profiles").select("id,nome").eq("role", "leitor").order("nome"),
    db.from("reading_progress").select("chapter_id, chapters!inner(series_id)").eq("chapters.series_id", id),
    db.from("personagens").select("*").order("ordem"),
    db.from("personagens_series").select("personagem_id,series_id"),
    db.from("series").select("id,titulo").order("titulo"),
  ]);
  const vinculos = (vinc ?? []) as { personagem_id: string; series_id: string }[];
  const personagens = (pers ?? []) as Personagem[];
  const serie = s as Serie | null;
  if (!serie) notFound();
  const capitulos = (c ?? []) as Capitulo[];

  const capaPath = serie.capa_path ?? capitulos.find((x) => x.capa_path)?.capa_path ?? null;
  const urls = await assinar([capaPath, serie.banner_path, ...personagens.map((p) => p.imagem_path)], EXPIRA_CAPA_S);

  const leitoresPorCap = new Map<string, number>();
  for (const p of (prog ?? []) as { chapter_id: string }[]) {
    leitoresPorCap.set(p.chapter_id, (leitoresPorCap.get(p.chapter_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/hqs" className="inline-flex items-center gap-2 text-sm text-suave hover:text-texto">
          <ArrowLeft size={16} /> Minhas HQs
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/serie/${serie.slug}`} className="inline-flex items-center gap-2 text-sm text-primaria">
            Ver como leitor <ExternalLink size={14} />
          </Link>
          <Link href={`/admin/publicar?hq=${serie.id}`} className="btn-primario h-10">
            <UploadCloud size={16} /> Publicar capítulos
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-bold">{serie.titulo}</h1>
      {nova && (
        <Alerta tipo="ok" titulo="HQ criada!">
          Agora crie o primeiro capítulo e envie o PDF. Lembre de publicar a HQ e o capítulo quando estiverem prontos.
        </Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr_1fr] lg:items-start">
        <aside className="space-y-4">
          <EnviarCapa serieId={serie.id} capaUrl={urls.get(capaPath ?? "") ?? null} personalizada={Boolean(serie.capa_path)} />
          <EnviarCapa
            tipo="banner"
            serieId={serie.id}
            capaUrl={urls.get(serie.banner_path ?? "") ?? null}
            personalizada={Boolean(serie.banner_path)}
          />
          <ExcluirSerie serieId={serie.id} titulo={serie.titulo} />
        </aside>
        <FormSerie
          serie={serie}
          leitores={(leitores ?? []) as { id: string; nome: string }[]}
          liberados={((acesso ?? []) as { user_id: string }[]).map((a) => a.user_id)}
        />
        <div className="space-y-8">
        <ListaCapitulos
          serieId={serie.id}
          capitulos={capitulos.map((x) => ({
            id: x.id,
            numero: x.numero,
            titulo: x.titulo,
            publicado: x.publicado,
            total_paginas: x.total_paginas,
            leitores: leitoresPorCap.get(x.id) ?? 0,
          }))}
        />
        <GerenciarHerois
          serieAtual={serie.id}
          series={(todasSeries ?? []) as { id: string; titulo: string }[]}
          herois={personagens.map((p) => ({
            id: p.id,
            nome: p.nome,
            cor: p.cor,
            imagemUrl: urls.get(p.imagem_path ?? "") ?? null,
            series: vinculos.filter((v) => v.personagem_id === p.id).map((v) => v.series_id),
          }))}
        />
        </div>
      </div>
    </div>
  );
}
