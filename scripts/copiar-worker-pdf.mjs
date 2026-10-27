// Copia o PDF.js para public/pdfjs (roda sozinho no npm install).
// O portal carrega esses arquivos direto no navegador, sem passar pelo
// empacotador do Next (o Turbopack costuma quebrar o PDF.js).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
try {
  const pasta = dirname(require.resolve("pdfjs-dist/package.json"));
  mkdirSync(join("public", "pdfjs"), { recursive: true });
  for (const f of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
    const origem = join(pasta, "build", f);
    if (!existsSync(origem)) throw new Error(`${f} não encontrado`);
    copyFileSync(origem, join("public", "pdfjs", f));
  }
  console.log("✔ PDF.js copiado para public/pdfjs/");
} catch (e) {
  console.warn("⚠ Não foi possível copiar o PDF.js:", e.message);
}
