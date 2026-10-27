import { notFound } from "next/navigation";
import { exigirLeitor } from "@/lib/auth";
import { carregarLeitura } from "@/lib/biblioteca";
import { rotuloCapitulo } from "@/lib/rotulos";
import { registrarAcesso } from "@/lib/acesso";
import { Leitor } from "@/components/leitor/Leitor";

export const dynamic = "force-dynamic";

export default async function LerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user, perfil } = await exigirLeitor();
  await registrarAcesso();
  const dados = await carregarLeitura(id, user.id);
  if (!dados) notFound();

  return (
    <>
      <title>{`${dados.serie.titulo} · ${rotuloCapitulo(dados.capitulo)}`}</title>
      <Leitor key={dados.capitulo.id} dados={dados} nomeLeitor={perfil.nome || "leitor"} />
    </>
  );
}
