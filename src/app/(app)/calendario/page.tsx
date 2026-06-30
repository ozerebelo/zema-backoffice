import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { toDateInput, fmtShort } from "@/lib/dates";
import styles from "./calendario.module.css";

export const dynamic = "force-dynamic";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const PALETTE = ["#2563EB", "#DC4A36", "#059669", "#7C3AED", "#D97706", "#0891B2", "#BE185D", "#65A30D", "#B45309", "#0F766E"];

type Ev = { day: string; kind: "rec" | "ent"; label: string; color: string; href: string; real: boolean };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ m?: string; view?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const now = new Date();
  const [yy, mm] = sp.m ? sp.m.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const year = yy;
  const month = mm - 1;

  const projetos = await prisma.projeto.findMany({ include: { episodios: { orderBy: { idx: "asc" } } } });

  // ── construir eventos (rec ↓ / entrega ↑), cor por projeto ──
  const evs: Ev[] = [];
  projetos.forEach((p, idx) => {
    const color = p.color ?? PALETTE[idx % PALETTE.length];
    const href = `/producao/${p.id}`;
    if (p.eps > 0 && p.episodios.length) {
      p.episodios.forEach((e, i) => {
        const rec = e.recReal ?? e.rec;
        const ent = e.entregaReal ?? e.entrega;
        if (rec) evs.push({ day: toDateInput(rec), kind: "rec", label: `${p.titulo} Ep.${i + 1}`, color, href, real: !!e.recReal });
        if (ent) evs.push({ day: toDateInput(ent), kind: "ent", label: `${p.titulo} Ep.${i + 1}`, color, href, real: !!e.entregaReal });
      });
    } else if (p.recepcao || p.prazo || p.entregaReal) {
      if (p.recepcao) evs.push({ day: toDateInput(p.recepcao), kind: "rec", label: p.titulo, color, href, real: false });
      const ent = p.entregaReal ?? p.prazo; // entrega real quando existe, senão o prazo planeado
      if (ent) evs.push({ day: toDateInput(ent), kind: "ent", label: p.titulo, color, href, real: !!p.entregaReal });
    }
  });

  const byDay = new Map<string, Ev[]>();
  for (const e of evs) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day)!.push(e);
  }
  const todayStr = toDateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));

  // ── células ──
  let cells: Date[];
  let label: string;
  if (view === "week") {
    const base = sp.m ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dow = (base.getUTCDay() + 6) % 7;
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() - dow);
    cells = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return d; });
    const end = cells[6];
    label = `${start.getUTCDate()} ${MESES[start.getUTCMonth()]} – ${end.getUTCDate()} ${MESES[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  } else {
    const first = new Date(Date.UTC(year, month, 1));
    const off = (first.getUTCDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setUTCDate(1 - off);
    cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setUTCDate(gridStart.getUTCDate() + i); return d; });
    if (cells[35].getUTCMonth() !== month) cells = cells.slice(0, 35);
    label = `${MESES[month]} ${year}`;
  }

  const prevM = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
  const nextM = month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`;
  const navHref = (m: string) => `/calendario?view=${view}&m=${m}`;

  // eventos visíveis (para a lista por baixo), agrupados por projeto+label
  const visibleDays = new Set(cells.map((d) => toDateInput(d)));
  const visEvs = evs.filter((e) => visibleDays.has(e.day));
  const grouped = new Map<string, { label: string; color: string; href: string; rec?: string; ent?: string; sort: string }>();
  for (const e of visEvs) {
    const g = grouped.get(e.label) ?? { label: e.label, color: e.color, href: e.href, sort: e.day };
    if (e.kind === "rec") g.rec = e.day; else g.ent = e.day;
    if (e.day < g.sort) g.sort = e.day;
    grouped.set(e.label, g);
  }
  const evRows = [...grouped.values()].sort((a, b) => a.sort.localeCompare(b.sort));

  return (
    <Page
      title="Calendário"
      sub={label}
      actions={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Link href={navHref(prevM)} className="btn btn-ghost btn-sm"><i className="ti ti-chevron-left" /></Link>
          <Link href={`/calendario?view=${view}`} className="btn btn-ghost btn-sm">Hoje</Link>
          <Link href={navHref(nextM)} className="btn btn-ghost btn-sm"><i className="ti ti-chevron-right" /></Link>
          <div className={styles.viewToggle}>
            <Link href={`/calendario?view=week${sp.m ? `&m=${sp.m}` : ""}`} className={view === "week" ? styles.vActive : ""}>Semana</Link>
            <Link href={`/calendario?view=month${sp.m ? `&m=${sp.m}` : ""}`} className={view === "month" ? styles.vActive : ""}>Mês</Link>
          </div>
        </div>
      }
    >
      <div className={styles.weekHead}>
        {DIAS.map((d) => <div key={d} className={styles.weekDay}>{d}</div>)}
      </div>
      <div className={styles.grid}>
        {cells.map((d, i) => {
          const ds = toDateInput(d);
          const out = view === "month" && d.getUTCMonth() !== month;
          const dayEvs = byDay.get(ds) ?? [];
          return (
            <div key={i} className={`${styles.cell} ${out ? styles.out : ""} ${ds === todayStr ? styles.today : ""}`}>
              <div className={styles.dayNum}>{d.getUTCDate()}</div>
              {dayEvs.map((e, j) => (
                <Link key={j} href={e.href} className={styles.ev}
                  style={{ background: `${e.color}22`, borderLeft: `2px solid ${e.color}` }} title={`${e.label} — ${e.kind === "rec" ? "Receção" : "Entrega"}`}>
                  <span style={{ color: e.color, fontWeight: 700 }}>{e.kind === "rec" ? "↓" : "↑"}</span> {e.label}
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span><span className={styles.arrow}>↓</span> Receção</span>
        <span><span className={styles.arrow}>↑</span> Entrega</span>
      </div>

      {evRows.length > 0 && (
        <>
          <div className={styles.evHead}>Eventos</div>
          <div className="card">
            {evRows.map((g) => (
              <Link href={g.href} className={styles.evRow} key={g.label}>
                <span className={styles.evDot} style={{ background: g.color }} />
                <span style={{ flex: 1 }}>{g.label}</span>
                {g.rec && <span className={styles.evDate}><span style={{ color: "var(--text-muted)" }}>↓</span> {fmtShort(new Date(g.rec + "T00:00:00Z"))}</span>}
                {g.ent && <span className={styles.evDate}><span style={{ color: g.color }}>↑</span> {fmtShort(new Date(g.ent + "T00:00:00Z"))}</span>}
              </Link>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
