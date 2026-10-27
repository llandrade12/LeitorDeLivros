import "server-only";
import { randomInt } from "node:crypto";

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar ditar a senha
const MAI = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MIN = "abcdefghijkmnpqrstuvwxyz";
const NUM = "23456789";

export function gerarSenhaTemporaria() {
  const todos = MAI + MIN + NUM;
  const chars = [
    MAI[randomInt(MAI.length)],
    NUM[randomInt(NUM.length)],
    ...Array.from({ length: 8 }, () => todos[randomInt(todos.length)]),
  ];
  // embaralha
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const s = chars.join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
