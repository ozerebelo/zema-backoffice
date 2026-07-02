import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ProjetoCard } from "@/components/ProjetoCard";
import { ProducaoFilters } from "@/components/ProducaoFilters";
import { calcProjStatus, projReview, isAprovado } from "@/lib/producao";
import { fmtMoney } from "@/lib/dates";
import styles from "@/components/projeto-card.module.css";

export const dynamic = "force-dynamic";

type SP = { q?: string; fase?: string; cli?: string; ano?: string; sort?: string };

export default async function ProducaoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [projetos, recibos, clientes] = await Promise.all([
    prisma.projeto.findMany({ include: { cliente: true, episodios: { orderBy: { idx: "asc" } } } }),
    prisma.recibo.findMany({ select: { projetoId: true, valor: true, data: true } }),
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const faturadoBy = new Map<string, number>();
  const lastReciboBy = new Map<string, Date>();
  for (const r of recibos) {
    faturadoBy.set(r.projetoId, (faturadoBy.get(r.projetoId) ?? 0) + Number(r.valor));
    const prev = lastReciboBy.get(r.projetoId);
    if (!prev || r.data > prev) lastReciboBy.set(r.projetoId, r.data);
  }

  const anos = Array.from(
    new Set(projetos.flatMap((p) => [p.prazo?.getUTCFullYear(), p.recepcao?.getUTCFullYear()]).filter(Boolean) as number[])
  ).sort((a, b) => b - a);

  const year = sp.ano && sp.ano !== "all" ? Number(sp.ano) : null;
  const q = (sp.q ?? "").toLowerCase();

  // Data de referência: entrega real do projeto → última entrega dos episódios
  // → prazo/receção → último recibo.
  const refDate = (p: (typeof projetos)[number]): Date | null => {
    if (p.entregaReal) return p.entregaReal;
    const epDates = p.episodios
      .map((e) => e.entregaReal ?? e.entrega)
      .filter(Boolean) as Date[];
    if (epDates.length) return epDates.reduce((a, b) => (a > b ? a : b));
    return p.prazo ?? p.recepcao ?? lastReciboBy.get(p.id) ?? null;
  };

  const matchesYear = (p: (typeof projetos)[number]) => {
    if (!year) return true;
    const ref = refDate(p);
    if (ref?.getUTCFullYear() === year) return true;
    if (!ref && year === new Date().getFullYear()) return true;
    return false;
  };
  const matches = (p: (typeof projetos)[number]) => {
    if (!matchesYear(p)) return false;
    if (q && !p.titulo.toLowerCase().includes(q) && !(p.cliente?.nome ?? "").toLowerCase().includes(q)) return false;
    if (sp.fase && sp.fase !== "all" && String(calcProjStatus(p).fase) !== sp.fase) return false;
    if (sp.cli && sp.cli !== "all" && p.clienteId !== sp.cli) return false;
    return true;
  };

  const sortFn = (a: (typeof projetos)[number], b: (typeof projetos)[number]) => {
    switch (sp.sort) {
      case "alpha": return a.titulo.localeCompare(b.titulo, "pt");
      case "valor": return Number(b.valor) - Number(a.valor);
      case "fase": return calcProjStatus(a).fase - calcProjStatus(b).fase;
      default: return (a.prazo?.getTime() ?? 9e15) - (b.prazo?.getTime() ?? 9e15);
    }
  };

  // "Em curso" = ainda não aprovado (inclui entregues em revisão); arquivo = aprovado.
  const active = projetos.filter((p) => !isAprovado(p) && matches(p)).sort(sortFn);
  const done = projetos.filter((p) => isAprovado(p) && matchesYear(p));

  // agrupar entregues por ano → cliente
  const byYear = new Map<string, Map<string, typeof done>>();
  for (const p of done) {
    const y = refDate(p)?.getUTCFullYear()?.toString() ?? "S/data";
    if (!byYear.has(y)) byYear.set(y, new Map());
    const cliKey = p.cliente?.nome ?? "—";
    const m = byYear.get(y)!;
    if (!m.has(cliKey)) m.set(cliKey, []);
    m.get(cliKey)!.push(p);
  }
  const sortedYears = [...byYear.keys()].sort((a, b) => b.localeCompare(a));
  const curYear = String(new Date().getFullYear());

  return (
    <Page
      title="Produção"
      sub={`${active.length} em curso`}
      actions={
        <Link href="/producao/novo" className="btn btn-red btn-sm">
          <i className="ti ti-plus" /> Novo projeto
        </Link>
      }
    >
      <ProducaoFilters clientes={clientes} anos={anos} />

      {active.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <i className="ti ti-movie" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
          Sem projetos em produção
        </div>
      )}

      <div className={styles.grid}>
        {active.map((p) => (
          <ProjetoCard
            key={p.id}
            p={{
              id: p.id, titulo: p.titulo, fase: p.fase, eps: p.eps, valor: Number(p.valor),
              prazo: p.prazo, dp: p.dp, cliente: p.cliente?.nome ?? null,
              episodios: p.episodios.map((e) => ({ fase: e.fase, entrega: e.entrega, entregaReal: e.entregaReal, recReal: e.recReal })),
              faturado: faturadoBy.get(p.id) ?? 0,
              review: projReview(p),
              materialChegou:
                p.episodios.length > 0
                  ? p.episodios.some((e) => e.fase < 4 && e.recReal != null) // algum episódio em curso já com material
                  : p.recepcaoReal != null, // sem episódios: receção real registada
            }}
          />
        ))}
      </div>

      {done.length > 0 && (
        <div className={styles.doneWrap}>
          {sortedYears.map((y) => {
            const clientesMap = byYear.get(y)!;
            const n = [...clientesMap.values()].reduce((s, arr) => s + arr.length, 0);
            return (
              <details key={y} className={styles.doneAcc} open={y === curYear}>
                <summary className={styles.doneSummary}>
                  <i className="ti ti-chevron-down" /> ✓ Entregues {y}
                  <span className={styles.doneCount}>{n} proj.</span>
                </summary>
                {[...clientesMap.keys()].sort().map((cli) => (
                  <div className={styles.doneGroup} key={cli}>
                    <div className={styles.doneCli}>{cli}</div>
                    {clientesMap.get(cli)!.map((p) => (
                      <Link href={`/producao/${p.id}`} className={styles.doneRow} key={p.id}>
                        <i className="ti ti-circle-check" />
                        <span style={{ flex: 1 }}>{p.titulo}</span>
                        {Number(p.valor) > 0 && <span className={styles.doneVal}>{fmtMoney(Number(p.valor))}</span>}
                      </Link>
                    ))}
                  </div>
                ))}
              </details>
            );
          })}
        </div>
      )}
    </Page>
  );
}
