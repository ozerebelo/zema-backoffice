// Migração do export JSON do backoffice v4.35 para a base de dados Postgres.
//
// Uso:
//   tsx scripts/migrate-from-json.ts [caminho-do-json] [--reset]
//
// - Por defeito lê ~/Desktop/zema_backoffice_2026-06-26.json
// - Aborta se a DB já tiver dados (a menos que --reset, que limpa tudo primeiro).
// - Limpa no caminho: valores string→número, datas "YYYY-MM-DD"→Date,
//   dedupe de histórico, ivaStates→linhas. NÃO funde duplicados (só reporta).
import { PrismaClient, type LeadStage, type FinState } from "@prisma/client";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const prisma = new PrismaClient();

// ─── args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const reset = args.includes("--reset");
const pathArg = args.find((a) => !a.startsWith("--"));
const JSON_PATH = pathArg
  ? resolve(pathArg)
  : resolve(homedir(), "Desktop", "zema_backoffice_2026-06-26.json");

// ─── helpers de limpeza ──────────────────────────────────────────
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};
const dateOnly = (v: unknown): Date | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
};

// "04/06 17h21" (sem ano) → Date best-effort (assume ano corrente do export).
const HISTORY_YEAR = 2026;
function parseHistoryTs(raw: unknown): Date {
  if (typeof raw === "string") {
    const m = raw.match(/^(\d{2})\/(\d{2})\s+(\d{1,2})h(\d{2})$/);
    if (m) {
      const [, dd, mm, hh, min] = m;
      const d = new Date(
        Date.UTC(HISTORY_YEAR, Number(mm) - 1, Number(dd), Number(hh), Number(min))
      );
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date(0);
}

// estado (label) → enum
const LEAD_STAGE_BY_LABEL: Record<string, LeadStage> = {
  "Contacto inicial": "contacto_inicial",
  "Proposta enviada": "proposta_enviada",
  "Em negociação": "em_negociacao",
  "Aguarda decisão": "aguarda_decisao",
};
const FIN_STATE_BY_LABEL: Record<string, FinState> = {
  "Em produção": "em_producao",
  Entregue: "entregue",
  Faturado: "faturado",
  Pago: "pago",
};

// deteção de quase-duplicados (Dice sobre bigramas)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos combinados
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  const t = s.replace(/\s+/g, "");
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}
function diceCoefficient(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// ─── carregar JSON ───────────────────────────────────────────────
type AnyObj = Record<string, any>;
const db: AnyObj = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const report: string[] = [];

async function main() {
  console.log(`→ A ler ${JSON_PATH}`);

  const existing = await prisma.cliente.count();
  if (existing > 0) {
    if (!reset) {
      throw new Error(
        `A DB já tem dados (${existing} clientes). Usa --reset para limpar e re-importar.`
      );
    }
    console.log("→ --reset: a limpar tabelas…");
    await prisma.$transaction([
      prisma.activity.deleteMany(),
      prisma.ivaState.deleteMany(),
      prisma.recibo.deleteMany(),
      prisma.proposta.deleteMany(),
      prisma.projetoHistory.deleteMany(),
      prisma.sessao.deleteMany(),
      prisma.episodeSchedule.deleteMany(),
      prisma.projeto.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.contacto.deleteMany(),
      prisma.cliente.deleteMany(),
    ]);
  }

  // mapas legacyId → novo UUID
  const cliMap = new Map<string, string>();
  const projMap = new Map<string, string>();

  // 1) Clientes (+contactos)
  for (const c of db.clientes ?? []) {
    const created = await prisma.cliente.create({
      data: {
        legacyId: c.id,
        empresa: str(c.empresa) ?? str(c.nome) ?? "—",
        nome: str(c.nome) ?? str(c.empresa) ?? "—",
        nif: str(c.nif),
        email: str(c.email),
        tel: str(c.tel),
        notas: str(c.notas),
        contactos: {
          create: (c.contactos ?? [])
            .filter((ct: AnyObj) => str(ct.nome))
            .map((ct: AnyObj) => ({
              nome: str(ct.nome)!,
              cargo: str(ct.cargo),
              email: str(ct.email),
              tel: str(ct.tel),
            })),
        },
      },
    });
    cliMap.set(c.id, created.id);
  }
  report.push(`Clientes: ${cliMap.size}`);

  // 2) Projetos (+episodios, sessoes, history)
  for (const p of db.projetos ?? []) {
    const history = dedupeHistory(p._history ?? []);
    const created = await prisma.projeto.create({
      data: {
        legacyId: p.id,
        titulo: str(p.titulo) ?? "—",
        clienteId: p.clienteId ? cliMap.get(p.clienteId) ?? null : null,
        tipo: str(p.tipo),
        dp: str(p.dp),
        camera: str(p.camera),
        formato: str(p.formato),
        duracao: str(p.duracao),
        eps: num(p.eps),
        recepcao: dateOnly(p.recepcao),
        prazo: dateOnly(p.prazo),
        fase: num(p.fase),
        valor: num(p.valor),
        notas: str(p.notas),
        internacional: !!p.internacional,
        color: str(p.color),
        episodios: {
          create: (p.epSchedule ?? []).map((e: AnyObj, idx: number) => ({
            idx,
            rec: dateOnly(e.rec),
            entrega: dateOnly(e.entrega),
            fase: num(e.fase),
            recReal: dateOnly(e.recReal),
            entregaReal: dateOnly(e.entregaReal),
            pontualidade: str(e.pontualidade),
          })),
        },
        sessoes: {
          create: (p.sessoes ?? [])
            .filter((s: AnyObj) => dateOnly(s.data))
            .map((s: AnyObj) => ({
              data: dateOnly(s.data)!,
              dur: str(s.dur),
              notas: str(s.notas),
            })),
        },
        history: {
          create: history.map((h) => ({
            ts: parseHistoryTs(h.ts),
            tsRaw: String(h.ts ?? ""),
            action: str(h.action) ?? "—",
            detail: str(h.detail),
          })),
        },
      },
    });
    projMap.set(p.id, created.id);
    if (p.clienteId && !cliMap.has(p.clienteId)) {
      report.push(`⚠ Projeto "${p.titulo}" referencia cliente inexistente (${p.clienteId})`);
    }
  }
  report.push(`Projetos: ${projMap.size}`);

  // 3) Leads
  let leads = 0;
  for (const l of db.leads ?? []) {
    await prisma.lead.create({
      data: {
        titulo: str(l.titulo) ?? "—",
        clienteId: l.clienteId ? cliMap.get(l.clienteId) ?? null : null,
        tipo: str(l.tipo),
        eps: num(l.eps),
        valEp: numOrNull(l.valEp),
        camera: str(l.camera),
        formato: str(l.formato),
        duracao: str(l.duracao),
        valor: num(l.valor),
        estado: LEAD_STAGE_BY_LABEL[l.estado] ?? "contacto_inicial",
        notas: str(l.notas),
        internacional: !!l.internacional,
      },
    });
    leads++;
  }
  report.push(`Leads: ${leads}`);

  // 4) Propostas
  let props = 0;
  for (const pr of db.propostas ?? []) {
    const projetoId = projMap.get(pr.projId);
    if (!projetoId) {
      report.push(`⚠ Proposta ${pr.id} ignora projeto inexistente (${pr.projId})`);
      continue;
    }
    await prisma.proposta.create({
      data: {
        projetoId,
        valor: num(pr.valor),
        estado: FIN_STATE_BY_LABEL[pr.estado] ?? "em_producao",
        notas: str(pr.notas),
        internacional: !!pr.internacional,
      },
    });
    props++;
  }
  report.push(`Propostas: ${props}`);

  // 5) Recibos
  let recs = 0;
  for (const r of db.recibos ?? []) {
    const projetoId = projMap.get(r.projId);
    const data = dateOnly(r.data);
    if (!projetoId || !data) {
      report.push(`⚠ Recibo ${r.id} ignorado (projeto=${r.projId}, data=${r.data})`);
      continue;
    }
    await prisma.recibo.create({
      data: {
        projetoId,
        valor: num(r.valor),
        data,
        notas: str(r.notas),
        internacional: !!r.internacional,
        pago: !!r.pago,
        taxaIRS: r.taxaIRS != null ? num(r.taxaIRS) : 0.23,
        taxaIVA: r.taxaIVA != null ? num(r.taxaIVA) : 0.23,
      },
    });
    recs++;
  }
  report.push(`Recibos: ${recs}`);

  // 6) ivaStates → linhas
  let ivas = 0;
  for (const [key, state] of Object.entries(db.ivaStates ?? {})) {
    const m = key.match(/^iva_(\d{4})_(\d)$/);
    if (!m) continue;
    await prisma.ivaState.create({
      data: { year: Number(m[1]), quarter: Number(m[2]), state: String(state) },
    });
    ivas++;
  }
  report.push(`IVA trimestres: ${ivas}`);

  // 7) Activity (ordem do array → createdAt decrescente sintético)
  const acts = db.activity ?? [];
  const base = Date.now();
  let actCount = 0;
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    await prisma.activity.create({
      data: {
        icon: str(a.icon),
        type: str(a.type),
        text: str(a.text) ?? "—",
        createdAt: new Date(base - i * 60_000),
      },
    });
    actCount++;
  }
  report.push(`Atividade: ${actCount}`);

  // 8) Relatório de quase-duplicados (revisão manual — não funde)
  const titles = (db.projetos ?? []).map((p: AnyObj) => ({
    id: p.id,
    t: str(p.titulo) ?? "",
    n: normalize(str(p.titulo) ?? ""),
  }));
  const dupes: string[] = [];
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const sim = diceCoefficient(titles[i].n, titles[j].n);
      if (sim >= 0.7) {
        dupes.push(`   • "${titles[i].t}" ~ "${titles[j].t}" (${(sim * 100) | 0}%)`);
      }
    }
  }

  console.log("\n──────── RELATÓRIO ────────");
  report.forEach((r) => console.log(" " + r));
  if (dupes.length) {
    console.log("\n ⚠ Possíveis duplicados (rever à mão, NÃO fundidos):");
    dupes.forEach((d) => console.log(d));
  } else {
    console.log("\n ✓ Sem duplicados óbvios detetados.");
  }
  console.log("───────────────────────────\n");
}

function dedupeHistory(
  hist: AnyObj[]
): { ts: string; action: string; detail: string }[] {
  const seen = new Set<string>();
  const out: { ts: string; action: string; detail: string }[] = [];
  for (const h of hist) {
    const key = `${h.ts}|${h.action}|${h.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ts: h.ts, action: h.action, detail: h.detail });
  }
  return out;
}

main()
  .catch((e) => {
    console.error("✗ Migração falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
