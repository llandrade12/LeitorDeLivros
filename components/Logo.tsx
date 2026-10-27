import { NOME_PORTAL, cx } from "@/lib/util";

export function Logo({ tamanho = "md" }: { tamanho?: "sm" | "md" | "lg" }) {
  const texto = { sm: "text-xl", md: "text-2xl", lg: "text-5xl" }[tamanho];
  const barra = { sm: "h-1 w-6", md: "h-1 w-8", lg: "h-1.5 w-12" }[tamanho];
  return (
    <span className="inline-flex flex-col gap-1.5">
      <span className={cx(texto, "font-black uppercase tracking-tight leading-none text-texto")}>
        {NOME_PORTAL}
      </span>
      <span className={cx(barra, "rounded-full bg-primaria")} />
    </span>
  );
}
