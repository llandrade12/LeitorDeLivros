import { Logo } from "@/components/Logo";

/** Tela dividida: arte à esquerda (some no celular), formulário à direita. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <Arte />
        <div className="relative flex h-full flex-col justify-center px-14">
          <Logo tamanho="lg" />
          <p className="mt-6 max-w-xs text-lg leading-snug text-texto/85">
            Sua biblioteca privada de histórias em quadrinhos.
          </p>
        </div>
      </section>

      <section className="flex flex-col">
        {/* topo com arte no celular */}
        <div className="relative h-56 overflow-hidden lg:hidden">
          <Arte />
          <div className="relative flex h-full flex-col justify-end px-6 pb-6">
            <Logo tamanho="md" />
            <p className="mt-3 max-w-[15rem] text-sm text-texto/85">
              Sua biblioteca privada de histórias em quadrinhos.
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-start justify-center px-6 py-10 lg:items-center lg:px-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </section>
    </main>
  );
}

/** Arte abstrata (lua vermelha + traços de nanquim) — troque por uma arte sua em /public. */
function Arte() {
  return (
    <div aria-hidden className="absolute inset-0 bg-[#0c0c13]">
      <div className="absolute -right-10 top-[12%] size-72 rounded-full bg-[radial-gradient(circle_at_40%_40%,#e23a3a,#8f1b22_60%,#3a0b10)] opacity-80 blur-[1px]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_22px,rgba(255,255,255,0.025)_22px_23px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(77,131,244,0.18),transparent_55%)]" />
      {/* Coloque sua arte em public/arte-login.jpg e ela aparece aqui */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/arte-login.jpg)" }} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c0c13] via-[#0c0c13]/70 to-transparent" />
    </div>
  );
}
