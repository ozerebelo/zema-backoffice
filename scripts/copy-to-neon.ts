// Copia os dados da DB LOCAL para o Neon, preservando UUIDs.
// NÃO copia User (criado pelo seed). Ordem respeita as FKs.
// Uso:
//   SRC_DATABASE_URL=... DEST_DATABASE_URL=... npx tsx scripts/copy-to-neon.ts
import { PrismaClient } from "@prisma/client";

const SRC = process.env.SRC_DATABASE_URL;
const DEST = process.env.DEST_DATABASE_URL;
if (!SRC || !DEST) throw new Error("Define SRC_DATABASE_URL e DEST_DATABASE_URL");

const src = new PrismaClient({ datasources: { db: { url: SRC } } });
const dst = new PrismaClient({ datasources: { db: { url: DEST } } });

// Ordem de dependências (pais antes de filhos).
const ORDER = [
  "cliente",
  "contacto",
  "lead",
  "projeto",
  "episodeSchedule",
  "sessao",
  "projetoHistory",
  "proposta",
  "recibo",
  "ivaState",
  "activity",
] as const;

async function main() {
  for (const model of ORDER) {
    const rows = await (src as any)[model].findMany();
    if (rows.length === 0) {
      console.log(`· ${model}: 0 (nada a copiar)`);
      continue;
    }
    const res = await (dst as any)[model].createMany({
      data: rows,
      skipDuplicates: true,
    });
    console.log(`✓ ${model}: ${res.count}/${rows.length} copiados`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await src.$disconnect();
    await dst.$disconnect();
  });
