import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="space-y-5">
        <Logo tamanho="md" />
        <h1 className="text-xl font-bold">Página não encontrada</h1>
        <p className="text-sm text-suave">Essa página não existe ou você não tem acesso a ela.</p>
        <Link href="/" className="btn-primario">Voltar ao início</Link>
      </div>
    </main>
  );
}
