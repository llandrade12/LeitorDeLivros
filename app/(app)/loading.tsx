/** Esqueleto enquanto a página carrega (mesmo desenho do início) */
export default function Carregando() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="esqueleto min-h-[22rem] rounded-3xl sm:min-h-[26rem]" />
        <div className="space-y-4">
          <div className="esqueleto h-6 w-40" />
          <div className="esqueleto h-28 rounded-2xl" />
          <div className="esqueleto h-6 w-32" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="esqueleto h-36 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="esqueleto h-6 w-48" />
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="esqueleto aspect-[2/3]" />
            <div className="esqueleto h-3 w-3/4" />
            <div className="esqueleto h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
