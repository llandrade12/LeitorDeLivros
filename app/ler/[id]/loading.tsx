import { LoaderCircle } from "lucide-react";

export default function CarregandoLeitor() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black text-suave">
      <div className="flex flex-col items-center gap-3">
        <LoaderCircle className="animate-spin text-primaria" size={28} />
        <p className="text-sm">Abrindo o capítulo…</p>
      </div>
    </div>
  );
}
