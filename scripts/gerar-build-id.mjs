// Gera um identificador novo a cada build. O valor entra no bundle do
// navegador e na resposta de /api/version: quando os dois divergem, o
// aparelho está com uma versão antiga carregada e precisa recarregar.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "app", "lib", "build-id.ts");

const carimbo = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const buildId = `${carimbo}-${Math.random().toString(36).slice(2, 8)}`;

writeFileSync(
  destino,
  `// Gerado por scripts/gerar-build-id.mjs a cada build — nao editar a mao.\n` +
    `export const BUILD_ID = "${buildId}";\n`,
  "utf8"
);

console.log(`build id: ${buildId}`);
