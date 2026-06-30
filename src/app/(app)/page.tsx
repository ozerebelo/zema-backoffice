import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { quarterLabel } from "@/lib/tax";
import { yearSummary, roundSummary } from "@/lib/finance";
import { fmtMoney, fmtShort } from "@/lib/dates";
import { faseLabel } from "@/lib/domain";
import { isAprovado } from "@/lib/producao";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function daysUntil(d: Date): number {
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

export default async function DashboardPage() {
  const [projetos, recibos, leads, propostas, ivaStates, activity] = await Promise.all([
    prisma.projeto.findMany({ include: { cliente: true, episodios: true } }),
    prisma.recibo.findMany(),
    prisma.lead.findMany(),
    prisma.proposta.findMany(),
    prisma.ivaState.findMany(),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const ano = new Date().getFullYear();
  const fin = roundSummary(yearSummary(recibos, ano));

  const emProducao = projetos.filter((p) => !isAprovado(p)).length;
  const ivaPendentes = ivaStates.filter((i) => i.state !== "pago");

  // Header (como o original): Leads · Produção · Faturado · Por faturar
  const leadVal = leads.reduce((s, l) => s + Number(l.valor), 0);
  const faturadoAll = recibos.reduce((s, r) => s + Number(r.valor), 0);
  const faturadoAno = recibos
    .filter((r) => r.data.getUTCFullYear() === ano)
    .reduce((s, r) => s + Number(r.valor), 0);
  const porFaturar = Math.max(0, propostas.reduce((s, p) => s + Number(p.valor), 0) - faturadoAll);

  type Urg = { id: string; titulo: string; cliente: string; label: string; date: Date; dias: number };
  const urgencias: Urg[] = [];
  for (const p of projetos) {
    if (p.fase >= 4) continue;
    for (const e of p.episodios) {
      if (e.entrega && !e.entregaReal) {
        urgencias.push({
          id: p.id,
          titulo: p.titulo,
          cliente: p.cliente?.nome ?? "—",
          label: `Ep. ${e.idx + 1} — entrega`,
          date: e.entrega,
          dias: daysUntil(e.entrega),
        });
      }
    }
    if (p.prazo && p.episodios.length === 0) {
      urgencias.push({
        id: p.id,
        titulo: p.titulo,
        cliente: p.cliente?.nome ?? "—",
        label: faseLabel(p.fase),
        date: p.prazo,
        dias: daysUntil(p.prazo),
      });
    }
  }
  urgencias.sort((a, b) => a.dias - b.dias);
  const topUrg = urgencias.slice(0, 7);

  // Movimentos recentes: últimas receções (↓) e entregas (↑) já concretizadas.
  type Mov = { id: string; titulo: string; cliente: string; kind: "rec" | "entrega"; label: string; date: Date };
  const movimentos: Mov[] = [];
  const hojeUTC = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const jaAconteceu = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) <= hojeUTC;
  for (const p of projetos) {
    const cliente = p.cliente?.nome ?? "—";
    if (p.episodios.length > 0) {
      for (const e of p.episodios) {
        if (e.recReal) movimentos.push({ id: p.id, titulo: p.titulo, cliente, kind: "rec", label: `Ep. ${e.idx + 1} recebido`, date: e.recReal });
        if (e.entregaReal) movimentos.push({ id: p.id, titulo: p.titulo, cliente, kind: "entrega", label: `Ep. ${e.idx + 1} entregue`, date: e.entregaReal });
      }
    } else {
      if (p.recepcao) movimentos.push({ id: p.id, titulo: p.titulo, cliente, kind: "rec", label: "Material recebido", date: p.recepcao });
      if (p.entregaReal) movimentos.push({ id: p.id, titulo: p.titulo, cliente, kind: "entrega", label: "Entregue", date: p.entregaReal });
    }
  }
  const recentes = movimentos
    .filter((m) => jaAconteceu(m.date))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7);

  const stats = [
    { label: "Leads activos", value: String(leads.length), sub: `${fmtMoney(leadVal)} potencial`, color: "#2563EB" },
    { label: "Em produção", value: String(emProducao), sub: `de ${projetos.length} total`, color: "#D97706" },
    { label: `Faturado ${ano}`, value: fmtMoney(faturadoAno), sub: "recibos emitidos este ano", color: "#059669" },
    { label: "Por faturar", value: fmtMoney(porFaturar), sub: "em propostas activas", color: "#7C3AED" },
  ];

  return (
    <Page title="Dashboard" sub={`${ano}`}>
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ padding: "14px 16px", borderTop: `3px solid ${s.color}` }}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid2}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Próximos prazos</span>
            </div>
            {topUrg.length === 0 && <div className={styles.empty}>Sem prazos pendentes 🎉</div>}
            {topUrg.map((u, i) => {
              const tone = u.dias < 0 ? "badge-red" : u.dias <= 3 ? "badge-amber" : "badge-blue";
              const txt = u.dias < 0 ? `${Math.abs(u.dias)}d atraso` : u.dias === 0 ? "hoje" : `${u.dias}d`;
              return (
                <Link href={`/producao/${u.id}`} className={styles.urgRow} key={i}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className={styles.urgTitle}>{u.titulo}</div>
                    <div className={styles.urgSub}>
                      {u.cliente} · {u.label} · {fmtShort(u.date)}
                    </div>
                  </div>
                  <span className={`badge ${tone}`}>{txt}</span>
                </Link>
              );
            })}
          </div>

          <div className="card">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Recentes</span>
              <span className={styles.empty} style={{ padding: 0, fontSize: 11 }}>receções ↓ · entregas ↑</span>
            </div>
            {recentes.length === 0 && <div className={styles.empty}>Sem movimentos recentes</div>}
            {recentes.map((m, i) => (
              <Link href={`/producao/${m.id}`} className={styles.urgRow} key={i}>
                <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    aria-hidden
                    style={{
                      color: m.kind === "entrega" ? "#059669" : "#2563EB",
                      fontWeight: 800,
                      fontSize: 15,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {m.kind === "entrega" ? "↑" : "↓"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.urgTitle}>{m.titulo}</div>
                    <div className={styles.urgSub}>{m.cliente} · {m.label}</div>
                  </div>
                </div>
                <span className={styles.urgSub} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{fmtShort(m.date)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Financeiro {ano}</span>
            </div>
            <div className={styles.finRow}>
              <span>Bruto (c/ IVA)</span>
              <strong>{fmtMoney(fin.bruto)}</strong>
            </div>
            <div className={styles.finRow}>
              <span>Líquido (após IRS)</span>
              <strong style={{ color: "var(--ink)" }}>{fmtMoney(fin.liquido)}</strong>
            </div>
            <div className={styles.finRow}>
              <span>Já recebido</span>
              <strong style={{ color: "var(--green-fg)" }}>{fmtMoney(fin.cobrado)}</strong>
            </div>
            <div className={styles.finRow}>
              <span>Por receber</span>
              <strong style={{ color: "var(--red)" }}>{fmtMoney(fin.porCobrar)}</strong>
            </div>
            {ivaPendentes.length > 0 && (
              <div className={styles.finRow}>
                <span>IVA pendente</span>
                <strong style={{ color: "var(--amber-fg)" }}>
                  {quarterLabel(ivaPendentes[0].year, ivaPendentes[0].quarter)}
                </strong>
              </div>
            )}
          </div>

          <div className="card">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Atividade recente</span>
            </div>
            {activity.map((a) => (
              <div className={styles.actRow} key={a.id}>
                <div className={`${styles.actIcon} ${a.type === "green" ? styles.actGreen : ""}`}>
                  <i className={`ti ${a.icon ?? "ti-point"}`} />
                </div>
                <span className={styles.actText}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
