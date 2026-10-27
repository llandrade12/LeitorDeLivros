import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { exigirLeitor } from "@/lib/auth";
import { carregarBiblioteca, type ResumoSerie } from "@/lib/biblioteca";
import { CapaHQ, ImagemCapa } from "@/components/biblioteca/CapaHQ";
import { CartaoContinuar } from "@/components/biblioteca/CartaoContinuar";
import { CartaoHeroi } from "@/components/biblioteca/Herois";
import { carregarPersonagens } from "@/lib/personagens";

export const dynamic = "force-dynamic";

/** Mais bem avaliadas primeiro; sem notas, as mais recentes. */
function porAvaliacao(a: ResumoSerie, b: ResumoSerie) {
  const na = a.mediaNota ?? -1;
  const nb = b.mediaNota ?? -1;
  if (nb !== na) return nb - na;
  if (b.totalNotas !== a.totalNotas) return b.totalNotas - a.totalNotas;
  return b.atualizadoConteudo.localeCompare(a.atualizadoConteudo);
}

export default async function InicioPage() {
  const { user, perfil } = await exigirLeitor();
  const series = (await carregarBiblioteca(user.id)).filter((s) => s.capitulos.length > 0 || perfil.role === "admin");
  const primeiroNome = perfil.nome.split(" ")[0] || "leitor";

  if (series.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <h1 className="text-2xl font-bold lg:text-3xl">Olá, {primeiroNome}!</h1>
        <section className="cartao grid place-items-center px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-superficie text-primaria">
            <BookOpen size={26} />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Nenhuma HQ publicada ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-suave">Assim que novas histórias forem publicadas, elas aparecem aqui.</p>
          {perfil.role === "admin" && (
            <Link href="/admin/publicar" className="btn-primario mt-6">
              Publicar a primeira HQ
            </Link>
          )}
        </section>
      </div>
    );
  }

  const comCapitulos = series.filter((s) => s.capitulos.length > 0);
  const destaque =
    [...comCapitulos].sort((a, b) => b.atualizadoConteudo.localeCompare(a.atualizadoConteudo))[0] ?? series[0];
  const continuar = comCapitulos
    .filter((s) => s.estado === "em_leitura" && s.continuar)
    .sort((a, b) => (b.ultimaLeitura ?? "").localeCompare(a.ultimaLeitura ?? ""))
    .slice(0, 2);
  const favoritas = series.filter((s) => s.favorito).slice(0, 4);
  const herois = await carregarPersonagens();
  const idsFavoritas = new Set(series.filter((s) => s.favorito).map((s) => s.id));
  const heroisDestaque = [...herois]
    .sort((a, b) => Number(b.series.some((i) => idsFavoritas.has(i))) - Number(a.series.some((i) => idsFavoritas.has(i))))
    .slice(0, 4);
  const topAvaliadas = [...series].sort(porAvaliacao).slice(0, 6);
  const alvo = destaque.continuar;
  const arte = destaque.bannerUrl ?? destaque.capaUrl;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* DESTAQUE */}
        <section className="relative isolate flex min-h-[22rem] overflow-hidden rounded-3xl bg-painel ring-1 ring-white/5 sm:min-h-[26rem]">
          {arte && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arte} alt="" draggable={false} className="absolute inset-0 -z-20 size-full object-cover object-[center_20%]" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/10 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/45 sm:to-transparent" />
          <div className="mt-auto flex max-w-xl flex-col gap-3 p-6 sm:p-10">
            {destaque.autor ? (
              <span className="text-sm text-texto/85">{destaque.autor}</span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-texto/90">Destaque</span>
            )}
            <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">{destaque.titulo}</h1>
            {(destaque.chamada || destaque.sinopse) && (
              <p className="line-clamp-2 max-w-sm text-sm text-texto/85 sm:text-base">{destaque.chamada || destaque.sinopse}</p>
            )}
            {alvo && (
              <Link href={`/ler/${alvo.id}`} className="btn-primario mt-2 h-12 w-fit rounded-full px-7 text-[15px]">
                <BookOpen size={18} />
                {destaque.estado === "nao_iniciado" ? "Ler agora" : "Continuar"}
              </Link>
            )}
          </div>
        </section>

        {/* LATERAL */}
        <aside className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Continuar lendo</h2>
            {continuar.length ? (
              continuar.map((s) => <CartaoContinuar key={s.id} serie={s} />)
            ) : (
              <p className="rounded-2xl border border-dashed border-borda p-5 text-sm text-suave">
                Quando você começar uma HQ, ela aparece aqui para retomar de onde parou.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold">{idsFavoritas.size ? "Seus heróis favoritos" : "Heróis"}</h2>
            {heroisDestaque.length ? (
              <div className="grid grid-cols-4 gap-2">
                {heroisDestaque.map((h) => (
                  <CartaoHeroi key={h.id} heroi={h} />
                ))}
              </div>
            ) : favoritas.length ? (
              <div className="grid grid-cols-4 gap-2.5">
                {favoritas.map((s) => (
                  <Link
                    key={s.id}
                    href={`/serie/${s.slug}`}
                    title={s.titulo}
                    className="aspect-[3/5] overflow-hidden rounded-2xl ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-primaria"
                  >
                    <ImagemCapa url={s.capaUrl} titulo={s.titulo} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-borda p-5 text-sm text-suave">
                {perfil.role === "admin"
                  ? "Cadastre os personagens na edição de cada HQ para eles aparecerem aqui."
                  : "Os heróis das HQs aparecem aqui."}
              </p>
            )}
          </section>
        </aside>
      </div>

      <hr className="border-borda/60" />

      {/* MAIS BEM AVALIADAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Mais bem avaliadas</h2>
          <Link href="/biblioteca?ordem=avaliacao" className="inline-flex items-center gap-1.5 text-sm text-primaria">
            Ver tudo <ArrowRight size={15} />
          </Link>
        </div>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
          {topAvaliadas.map((s) => (
            <li key={s.id}>
              <CapaHQ serie={s} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
