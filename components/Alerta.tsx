import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cx } from "@/lib/util";

type Tipo = "erro" | "ok" | "info";

const estilos: Record<Tipo, { caixa: string; icone: React.ReactNode }> = {
  erro: { caixa: "border-perigo/30 bg-perigo/10 text-perigo", icone: <CircleAlert size={18} /> },
  ok: { caixa: "border-sucesso/30 bg-sucesso/10 text-sucesso", icone: <CircleCheck size={18} /> },
  info: { caixa: "border-primaria/30 bg-primaria/10 text-primaria", icone: <Info size={18} /> },
};

export function Alerta({
  tipo,
  titulo,
  children,
}: {
  tipo: Tipo;
  titulo?: string;
  children?: React.ReactNode;
}) {
  const e = estilos[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-3.5 text-sm", e.caixa)}>
      <span className="mt-0.5 shrink-0">{e.icone}</span>
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className="text-texto/80">{children}</div>}
      </div>
    </div>
  );
}
