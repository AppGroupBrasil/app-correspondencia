import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const reportsDir = path.resolve("./reports");
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .split("Z")[0];

const results = {
  typecheck: false,
  lint: false,
};

// 1️⃣ TYPECHECK
console.log("🔎 1/2 TypeScript typecheck...");
try {
  execSync("npx tsc --noEmit", { stdio: "pipe" });
  results.typecheck = true;
} catch (err) {
  const logPath = path.join(reportsDir, `typecheck_${timestamp}.log`);
  fs.writeFileSync(logPath, err.stdout?.toString() || err.message);
  console.log(`❌ TypeScript erros → ${logPath}`);
}

// 2️⃣ ESLINT
console.log("🧹 2/2 ESLint...");
try {
  execSync("npx eslint . --ext .js,.jsx,.ts,.tsx", { stdio: "pipe" });
  results.lint = true;
} catch (err) {
  const logPath = path.join(reportsDir, `eslint_${timestamp}.log`);
  fs.writeFileSync(logPath, err.stdout?.toString() || err.message);
  console.log(`❌ ESLint problemas → ${logPath}`);
}

// Resultado final
console.log("\n════════ RESULTADO ════════");
console.log(`TypeScript: ${results.typecheck ? "✅ OK" : "❌ Erros"}`);
console.log(`ESLint/Next lint: ${results.lint ? "✅ OK" : "❌ Problemas"}`);
console.log(`Relatórios salvos em: ./reports\n`);

if (results.typecheck && results.lint) {
  console.log("🎉 Nenhum problema encontrado. Sistema está limpo e pronto para build!");
}
