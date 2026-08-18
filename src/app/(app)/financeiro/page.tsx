import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { PropostaEstadoSelect } from "@/components/PropostaEstadoSelect";
import { DeleteButton } from "@/components/DeleteButton";
import { toggleReciboPago, setIvaQuarter, deleteRecibo } from "./actions";
import { calcImpostos, getQuarter, quarterLabel, quarterDeadlineLabel, quarterDeadlineDate } from "@/lib/tax";
import { yearSummary, roundSummary, reciboImpostos } from "@/lib/finance";
import { fmtMoney, fmtShort } from "@/lib/dates";
import { FIN_STATES, FIN_STATE_COLOR } from "@/lib/domain";
import styles from "./financeiro.module.css";

export const dynamic = "force-dynamic";

const Q_NAMES = ["", "Jan–Mar", "Abr–Jun", "Jul–Set", "Out–Dez"];
const round2 = (n: number) => Math.round(n * 100) / 100;

type SP = { tab?: string; ano?: string; sub?: string };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "projetos";
  const sub = sp.sub ?? "curso";

  const [recibos, projetos, propostas, ivaStates] = await Promise.all([
    prisma.recibo.findMany({ include: { projeto: { include: { cliente: true } } }, orderBy: { data: "desc" } }),
    prisma.projeto.findMany(),
    prisma.proposta.findMany({ include: { projeto: { include: { cliente: true } } } }),
    prisma.ivaState.findMany(),
  ]);

  const anos = Array.from(
    new Set([new Date().getFullYear(), ...recibos.map((r) => r.data.getUTCFullYear())])
  ).sort((a, b) => b - a);
  const ano = sp.ano ? Number(sp.ano) : anos[0];

  const href = (p: { tab?: string; ano?: number | string; sub?: string }) =>
    `/financeiro?tab=${p.tab ?? tab}&ano=${p.ano ?? ano}${p.sub ? `&sub=${p.sub}` : ""}`;

  // ── KPIs (bruto = valor tributável, SEM IVA; 1 valor contratado por projeto) ──
  // bruto faturado este ano = soma do valor de TODOS os recibos do ano (pagos ou não)
  const faturadoByProj = new Map<string, number>();
  let brutoFaturado = 0;
  for (const r of recibos) {
    if (r.data.getUTCFullYear() !== ano) continue;
    const v = Number(r.valor);
    brutoFaturado += v;
    faturadoByProj.set(r.projetoId, (faturadoByProj.get(r.projetoId) ?? 0) + v);
  }

  // bruto por faturar = valor contratado ainda sem recibo emitido (por projeto)
  let brutoPorFaturar = 0;
  for (const p of projetos) {
    const contratado = Number(p.valor);
    const jaFaturado = faturadoByProj.get(p.id) ?? 0;
    brutoPorFaturar += Math.max(0, contratado - jaFaturado);
  }

  // total bruto do ano = faturado + por faturar
  const totalBruto = brutoFaturado + brutoPorFaturar;

  // IVA do trimestre corrente (ano e trimestre actuais, nacionais)
  const nowD = new Date();
  const curYear = nowD.getUTCFullYear();
  const curQ = Math.ceil((nowD.getUTCMonth() + 1) / 3);
  let ivaTrimestre = 0;
  for (const r of recibos) {
    if (r.internacional) continue;
    if (r.data.getUTCFullYear() === curYear && getQuarter(r.data) === curQ) ivaTrimestre += reciboImpostos(r).iva;
  }

  // Líquido recebido no ano seleccionado
  let liquidoAno = 0;
  for (const r of recibos) {
    if (r.pago && r.data.getUTCFullYear() === ano) liquidoAno += reciboImpostos(r).liquido;
  }

  const TABS = [
    { key: "projetos", label: "Projetos" },
    { key: "recibos", label: "Recibos" },
    { key: "cobrar", label: "Por receber" },
    { key: "iva", label: "Trimestres IVA" },
    { key: "anual", label: "Resumo anual" },
  ];

  const stats = [
    { label: `Total bruto ${ano}`, value: fmtMoney(round2(totalBruto)), sub: "faturado + por faturar", color: "#12284C" },
    { label: "Bruto faturado", value: fmtMoney(round2(brutoFaturado)), sub: `recibos emitidos em ${ano}`, color: "#059669" },
    { label: "Bruto por faturar", value: fmtMoney(round2(brutoPorFaturar)), sub: "sem recibo emitido", color: "#7C3AED" },
    { label: `IVA Q${curQ} ${curYear}`, value: fmtMoney(round2(ivaTrimestre)), sub: "trimestre corrente", color: "#DC4A36" },
    { label: `Líquido recebido ${ano}`, value: fmtMoney(round2(liquidoAno)), sub: "já recebido este ano", color: "#2563EB" },
  ];

  return (
    <Page
      title="Financeiro"
      actions={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className={styles.years}>
            {anos.map((y) => (
              <Link key={y} href={href({ ano: y })} className={`${styles.yearBtn} ${y === ano ? styles.yearActive : ""}`}>
                {y}
              </Link>
            ))}
          </div>
          <Link href="/financeiro/recibo/novo" className="btn btn-primary btn-sm">
            <i className="ti ti-receipt" /> Emitir recibo
          </Link>
        </div>
      }
    >
      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ padding: "13px 15px", borderTop: `3px solid ${s.color}` }}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link key={t.key} href={href({ tab: t.key })} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "projetos" && <ProjetosTab propostas={propostas} recibos={recibos} sub={sub} hrefSub={(s: string) => href({ sub: s })} />}
      {tab === "recibos" && <RecibosTab recibos={recibos} ano={ano} ivaStates={ivaStates} />}
      {tab === "cobrar" && <CobrarTab recibos={recibos} />}
      {tab === "iva" && <IvaTab recibos={recibos} ano={ano} ivaStates={ivaStates} />}
      {tab === "anual" && <AnualTab recibos={recibos} ano={ano} />}
    </Page>
  );
}

/* ── Projetos (agrupados por estado) ─────────────────────────── */
function ProjetosTab({ propostas, recibos, sub, hrefSub }: any) {
  const list = propostas.filter((pr: any) => (sub === "pagos" ? pr.estado === "pago" : pr.estado !== "pago"));

  type Grp = { key: string; label: string; color: string; items: any[] };
  const byTitle = (a: any, b: any) => (a.projeto?.titulo ?? "").localeCompare(b.projeto?.titulo ?? "", "pt");
  let groups: Grp[];

  if (sub === "pagos") {
    // Arquivo agrupado pelo trimestre da data do último recibo do projeto.
    const m = new Map<string, { year: number; q: number; items: any[] }>();
    for (const pr of list) {
      const rs = recibos.filter((r: any) => r.projetoId === pr.projetoId);
      const last = rs.length ? rs.reduce((a: any, b: any) => (a.data > b.data ? a : b)).data : null;
      const year = last ? last.getUTCFullYear() : 0;
      const q = last ? getQuarter(last) : 0;
      const key = last ? `${year}-${q}` : "sem";
      if (!m.has(key)) m.set(key, { year, q, items: [] });
      m.get(key)!.items.push(pr);
    }
    groups = [...m.values()]
      .sort((a, b) => b.year - a.year || b.q - a.q)
      .map((g) => ({
        key: g.year ? `${g.year}-${g.q}` : "sem",
        label: g.year ? quarterLabel(g.year, g.q) : "Sem data",
        color: FIN_STATE_COLOR.pago,
        items: g.items.sort(byTitle),
      }));
  } else {
    groups = (["em_producao", "entregue", "faturado"] as const)
      .map((st): Grp => {
        const meta = FIN_STATES.find((s) => s.value === st)!;
        return { key: st, label: meta.label, color: meta.color, items: list.filter((pr: any) => pr.estado === st).sort(byTitle) };
      })
      .filter((g) => g.items.length > 0);
  }

  const row = (pr: any) => {
    const val = Number(pr.valor);
    const imp = calcImpostos(val, pr.internacional);
    const faturado = recibos.filter((r: any) => r.projetoId === pr.projetoId).reduce((s: number, r: any) => s + Number(r.valor), 0);
    const pct = val > 0 ? Math.min(100, Math.round((faturado / val) * 100)) : 0;
    return (
      <div className={styles.projRow} key={pr.id} style={{ borderLeft: `3px solid ${FIN_STATE_COLOR[pr.estado as keyof typeof FIN_STATE_COLOR]}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.projTitle}>
            {pr.projeto?.titulo ?? "—"}
            {pr.internacional ? <span className={styles.intTag}>INT</span> : null}
          </div>
          <div className={styles.projCli}>{pr.projeto?.cliente?.nome ?? "—"}</div>
          {pr.internacional ? (
            <div className={styles.projTax} style={{ color: "var(--green-fg)" }}>Internacional — isento</div>
          ) : (
            <div className={styles.projTax}>
              Bruto c/IVA <b>{fmtMoney(imp.bruto)}</b> · IVA <b style={{ color: "var(--red)" }}>{fmtMoney(imp.iva)}</b> · Líquido <b style={{ color: "var(--green-fg)" }}>{fmtMoney(imp.liquido)}</b>
            </div>
          )}
          {faturado > 0 && (
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <strong className={styles.projVal}>{fmtMoney(val)}</strong>
        <PropostaEstadoSelect id={pr.id} estado={pr.estado} />
      </div>
    );
  };

  return (
    <>
      <div className={styles.subTabs}>
        <Link href={hrefSub("curso")} className={`${styles.subTab} ${sub !== "pagos" ? styles.subActive : ""}`}>Em curso</Link>
        <Link href={hrefSub("pagos")} className={`${styles.subTab} ${sub === "pagos" ? styles.subActive : ""}`}>Pagos / Arquivo</Link>
      </div>
      {groups.length === 0 && (
        <div className="card"><div className={styles.empty}>Nenhum projeto {sub === "pagos" ? "pago" : "em curso"}</div></div>
      )}
      {groups.map((g) => (
        <div className="card" key={g.key} style={{ marginBottom: 12 }}>
          <div className={styles.stateHead}>
            <span className={styles.stateDot} style={{ background: g.color }} />
            <span style={{ color: g.color }}>{g.label}</span>
            <span className={styles.stateCount}>{g.items.length}</span>
          </div>
          {g.items.map(row)}
        </div>
      ))}
    </>
  );
}

/* ── Recibos (por trimestre) ─────────────────────────────────── */
function RecibosTab({ recibos, ano, ivaStates }: any) {
  const recAno = recibos.filter((r: any) => r.data.getUTCFullYear() === ano);
  const groups = new Map<number, any[]>();
  for (const r of recAno) {
    const q = getQuarter(r.data);
    if (!groups.has(q)) groups.set(q, []);
    groups.get(q)!.push(r);
  }
  const quarters = [...groups.keys()].sort((a, b) => b - a);

  if (recAno.length === 0) return <div className={styles.empty}>Sem recibos em {ano}</div>;

  return (
    <div className="card">
      {quarters.map((q) => {
        const recs = groups.get(q)!;
        let iva = 0, liq = 0;
        for (const r of recs) { const t = reciboImpostos(r); iva += t.iva; liq += t.liquido; }
        const st = ivaStates.find((i: any) => i.year === ano && i.quarter === q)?.state ?? "pendente";
        return (
          <div key={q}>
            <div className={styles.qHead}>
              <strong>Q{q} {ano}</strong>
              <span className={styles.qSubInfo}>{Q_NAMES[q]} · {recs.length} recibo(s)</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: "var(--red)", fontSize: 11, fontWeight: 600 }}>IVA {fmtMoney(iva)}</span>
              <span style={{ color: "var(--green-fg)", fontSize: 11, fontWeight: 600 }}>Líq {fmtMoney(liq)}</span>
              <span className={`badge ${st === "pago" ? "badge-green" : "badge-amber"}`}>{st}</span>
            </div>
            {recs.map((r: any) => {
              const imp = reciboImpostos(r);
              return (
                <div className={styles.recRow} key={r.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.projTitle}>
                      {r.projeto?.titulo ?? "—"}
                      {r.notas ? <span className={styles.recNota}> — {r.notas}</span> : null}
                      {r.internacional ? <span className={styles.intTag}>INT</span> : null}
                    </div>
                    <div className={styles.projCli}>{r.projeto?.cliente?.nome ?? "—"} · {fmtShort(r.data)}</div>
                    {!r.internacional && (
                      <div className={styles.projTax}>
                        IVA <b style={{ color: "var(--red)" }}>{fmtMoney(imp.iva)}</b> · IRS <b style={{ color: "var(--amber-fg)" }}>{fmtMoney(imp.irs)}</b> · Líq <b style={{ color: "var(--green-fg)" }}>{fmtMoney(imp.liquido)}</b>
                      </div>
                    )}
                  </div>
                  <strong className={styles.projVal}>{fmtMoney(Number(r.valor))}</strong>
                  <form action={toggleReciboPago.bind(null, r.id)}>
                    <button type="submit" className={styles.iconBtn} title={r.pago ? "Recebido — reverter" : "Marcar recebido"} style={{ color: r.pago ? "var(--green-fg)" : "var(--text-muted)" }}>
                      <i className={`ti ${r.pago ? "ti-circle-check" : "ti-circle"}`} />
                    </button>
                  </form>
                  <DeleteButton
                    action={deleteRecibo.bind(null, r.id)}
                    confirmText={`Apagar o recibo de ${fmtMoney(Number(r.valor))}? Esta ação é irreversível.`}
                    className={styles.iconBtn}
                    title="Apagar"
                  >
                    <i className="ti ti-trash" style={{ color: "var(--text-muted)" }} />
                  </DeleteButton>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── Por cobrar (aging de recibos não pagos) ─────────────────── */
function daysOutstanding(d: Date): number {
  const t = new Date();
  const a = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((a - b) / 86_400_000);
}
function agingColor(dias: number): string {
  return dias > 90 ? "#991B1B" : dias > 60 ? "#DC4A36" : dias > 30 ? "#D97706" : "#059669";
}

function CobrarTab({ recibos }: any) {
  // Todos os recibos por receber (independente do ano — é o que interessa em tesouraria).
  const pend = recibos
    .filter((r: any) => !r.pago)
    .map((r: any) => ({ r, dias: daysOutstanding(r.data), imp: reciboImpostos(r) }))
    .sort((a: any, b: any) => b.dias - a.dias); // mais antigos primeiro

  if (pend.length === 0) {
    return <div className={styles.empty}>Tudo recebido 🎉 — sem recibos por receber.</div>;
  }

  const totalBruto = pend.reduce((s: number, x: any) => s + x.imp.bruto, 0);
  const totalLiq = pend.reduce((s: number, x: any) => s + x.imp.liquido, 0);

  const BUCKETS = [
    { label: "≤ 30 dias", color: "#059669", test: (d: number) => d <= 30 },
    { label: "31–60 dias", color: "#D97706", test: (d: number) => d > 30 && d <= 60 },
    { label: "61–90 dias", color: "#DC4A36", test: (d: number) => d > 60 && d <= 90 },
    { label: "+ 90 dias", color: "#991B1B", test: (d: number) => d > 90 },
  ];

  return (
    <>
      <div className={styles.statsGrid}>
        <div className="card" style={{ padding: "13px 15px", borderTop: "3px solid #DC4A36" }}>
          <div className={styles.statLabel}>Total por receber</div>
          <div className={styles.statValue} style={{ color: "#DC4A36" }}>{fmtMoney(round2(totalBruto))}</div>
          <div className={styles.statSub}>{pend.length} recibo(s) · líq. {fmtMoney(round2(totalLiq))}</div>
        </div>
        {BUCKETS.map((b) => {
          const items = pend.filter((x: any) => b.test(x.dias));
          const total = items.reduce((s: number, x: any) => s + x.imp.bruto, 0);
          return (
            <div className="card" key={b.label} style={{ padding: "13px 15px", borderTop: `3px solid ${b.color}` }}>
              <div className={styles.statLabel}>{b.label}</div>
              <div className={styles.statValue} style={{ color: b.color }}>{fmtMoney(round2(total))}</div>
              <div className={styles.statSub}>{items.length} recibo(s)</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        {pend.map(({ r, dias, imp }: any) => {
          const tone = agingColor(dias);
          return (
            <div className={styles.recRow} key={r.id}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: tone,
                  border: `1px solid ${tone}55`,
                  background: `${tone}12`,
                  borderRadius: 20,
                  padding: "3px 9px",
                  whiteSpace: "nowrap",
                  minWidth: 46,
                  textAlign: "center",
                }}
                title={`Emitido há ${dias} dia(s)`}
              >
                {dias <= 0 ? "hoje" : `${dias}d`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.projTitle}>
                  {r.projeto?.titulo ?? "—"}
                  {r.notas ? <span className={styles.recNota}> — {r.notas}</span> : null}
                  {r.internacional ? <span className={styles.intTag}>INT</span> : null}
                </div>
                <div className={styles.projCli}>{r.projeto?.cliente?.nome ?? "—"} · emitido {fmtShort(r.data)}</div>
                <div className={styles.projTax}>
                  Bruto c/IVA <b style={{ color: "var(--ink)" }}>{fmtMoney(imp.bruto)}</b> · Líq <b style={{ color: "var(--green-fg)" }}>{fmtMoney(imp.liquido)}</b>
                </div>
              </div>
              <strong className={styles.projVal}>{fmtMoney(Number(r.valor))}</strong>
              <form action={toggleReciboPago.bind(null, r.id)}>
                <button type="submit" className={styles.iconBtn} title="Marcar recebido" style={{ color: "var(--text-muted)" }}>
                  <i className="ti ti-circle" />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Trimestres IVA (como o original) ────────────────────────── */
function IvaTab({ recibos, ivaStates }: any) {
  const nationals = recibos.filter((r: any) => !r.internacional);
  const intCount = recibos.length - nationals.length;

  const groups = new Map<string, { year: number; q: number; recs: any[] }>();
  for (const r of nationals) {
    const year = r.data.getUTCFullYear();
    const q = getQuarter(r.data);
    const key = `${year}_${q}`;
    if (!groups.has(key)) groups.set(key, { year, q, recs: [] });
    groups.get(key)!.recs.push(r);
  }
  const sorted = [...groups.values()].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.q - a.q));

  if (sorted.length === 0) {
    return <div className={styles.empty}>{intCount ? `${intCount} recibo(s) internacional(is) — sem IVA. ` : ""}Sem recibos nacionais com IVA</div>;
  }

  const today = new Date();

  return (
    <div>
      {intCount > 0 && (
        <div className={styles.intNote}>
          <i className="ti ti-world" /> <span><b>{intCount} recibo(s) internacional(is)</b> excluído(s) do cálculo de IVA (fora do âmbito do IVA português)</span>
        </div>
      )}
      {sorted.map((g) => {
        const base = g.recs.reduce((s: number, r: any) => s + Number(r.valor), 0);
        const iva = g.recs.reduce((s: number, r: any) => s + reciboImpostos(r).iva, 0);
        const bruto = base + iva;
        const deadline = quarterDeadlineDate(g.year, g.q);
        const isPast = today > deadline;
        const isSoon = !isPast && deadline.getTime() - today.getTime() < 30 * 86_400_000;
        const state = ivaStates.find((i: any) => i.year === g.year && i.quarter === g.q)?.state ?? "pendente";
        const color = state === "pago" ? "#059669" : state === "declarado" ? "#7C3AED" : isPast ? "#DC4A36" : isSoon ? "#D97706" : "var(--text-muted)";
        const label = state === "pago" ? "IVA Pago" : state === "declarado" ? "Declarado" : isPast ? "Em atraso" : isSoon ? "Prazo próximo" : "Por declarar";

        return (
          <div className={styles.ivaCard} key={`${g.year}_${g.q}`}>
            <div className={styles.ivaHead}>
              <div style={{ flex: 1 }}>
                <div className={styles.ivaTitle}>{quarterLabel(g.year, g.q)}</div>
                <div className={styles.ivaSub}>{Q_NAMES[g.q]} {g.year} · {g.recs.length} recibo(s) nacional(is)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={styles.ivaBig}>{fmtMoney(round2(iva))}</div>
                <div className={styles.ivaSub}>IVA a entregar ao Estado</div>
              </div>
            </div>
            <div className={styles.ivaBody}>
              <div className={styles.ivaPills}>
                <div className={styles.ivaPill}><span>Base tributável</span><strong>{fmtMoney(round2(base))}</strong></div>
                <div className={`${styles.ivaPill} ${styles.ivaPillRed}`}><span>IVA</span><strong>{fmtMoney(round2(iva))}</strong></div>
                <div className={styles.ivaPill}><span>Total c/ IVA</span><strong>{fmtMoney(round2(bruto))}</strong></div>
              </div>
              <div className={styles.ivaDeadline} style={{ borderColor: `${color}44` }}>
                <i className="ti ti-calendar-due" style={{ color }} />
                <span style={{ flex: 1 }}>Prazo de entrega: <b style={{ color: "var(--ink)" }}>{quarterDeadlineLabel(g.year, g.q)}</b></span>
                <span className="badge" style={{ color, border: `1px solid ${color}55` }}>{label}</span>
                {state !== "declarado" && state !== "pago" && (
                  <form action={setIvaQuarter.bind(null, g.year, g.q, "declarado")}>
                    <button type="submit" className="btn btn-ghost btn-sm">Marcar declarado</button>
                  </form>
                )}
                {state === "declarado" && (
                  <form action={setIvaQuarter.bind(null, g.year, g.q, "pago")}>
                    <button type="submit" className="btn btn-ghost btn-sm" style={{ color: "var(--green-fg)" }}>Marcar pago</button>
                  </form>
                )}
                {state === "pago" && (
                  <form action={setIvaQuarter.bind(null, g.year, g.q, "pendente")}>
                    <button type="submit" className="btn btn-ghost btn-sm">Repor</button>
                  </form>
                )}
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th><th>Projeto / cliente</th>
                    <th className={styles.r}>Base</th><th className={styles.r}>IVA</th><th className={styles.r}>Bruto</th>
                    <th style={{ textAlign: "center" }}>Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {[...g.recs].sort((a, b) => a.data.getTime() - b.data.getTime()).map((r: any) => {
                    const imp = reciboImpostos(r);
                    return (
                      <tr key={r.id}>
                        <td style={{ color: "var(--text-muted)" }}>{fmtShort(r.data)}</td>
                        <td>
                          <div style={{ fontWeight: 500, color: "var(--ink)" }}>{r.projeto?.titulo ?? "—"}</div>
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{r.projeto?.cliente?.nome ?? "—"}</div>
                        </td>
                        <td className={styles.r}>{fmtMoney(Number(r.valor))}</td>
                        <td className={styles.r} style={{ color: "var(--red)", fontWeight: 600 }}>{fmtMoney(imp.iva)}</td>
                        <td className={styles.r}>{fmtMoney(imp.bruto)}</td>
                        <td style={{ textAlign: "center", color: r.pago ? "var(--green-fg)" : "var(--text-muted)" }}>
                          <i className={`ti ${r.pago ? "ti-circle-check" : "ti-circle"}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Resumo anual ────────────────────────────────────────────── */
function AnualTab({ recibos, ano }: any) {
  const byYear = new Map<number, ReturnType<typeof roundSummary>>();
  const years = Array.from(new Set(recibos.map((r: any) => r.data.getUTCFullYear()))) as number[];
  for (const y of years) byYear.set(y, roundSummary(yearSummary(recibos, y)));

  if (years.length === 0) return <div className={styles.empty}>Sem recibos emitidos</div>;

  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ano</th>
            <th className={styles.r}>Recibos</th>
            <th className={styles.r}>Base</th>
            <th className={styles.r}>Bruto c/IVA</th>
            <th className={styles.r}>IVA</th>
            <th className={styles.r}>IRS</th>
            <th className={styles.r}>Líquido</th>
            <th className={styles.r}>Internacional</th>
          </tr>
        </thead>
        <tbody>
          {[...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([y, d]) => (
            <tr key={y} className={y === ano ? styles.rowActive : ""}>
              <td><strong>{y}</strong></td>
              <td className={styles.r}>{d.n}</td>
              <td className={styles.r}>{fmtMoney(d.base)}</td>
              <td className={styles.r}>{fmtMoney(d.bruto)}</td>
              <td className={styles.r} style={{ color: "var(--red)" }}>{fmtMoney(d.iva)}</td>
              <td className={styles.r} style={{ color: "var(--amber-fg)" }}>{fmtMoney(d.irs)}</td>
              <td className={styles.r} style={{ color: "var(--green-fg)" }}>{fmtMoney(d.liquido)}</td>
              <td className={styles.r} style={{ color: "var(--text-muted)" }}>{fmtMoney(d.internacional)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
