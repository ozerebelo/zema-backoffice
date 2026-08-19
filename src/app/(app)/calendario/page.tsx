import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { toDateInput, fmtShort } from "@/lib/dates";
import styles from "./calendario.module.css";

export const dynamic = "force-dynamic";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const PALETTE = ["#2563EB", "#DC4A36", "#059669", "#7C3AED", "#D97706", "#0891B2", "#BE185D", "#65A30D", "#B45309", "#0F766E"];

/** Cor estável e distinta por projeto (hash do id → paleta). */
function projColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

type Ev = { day: string; kind: "rec" | "ent"; label: string; color: string; href: string; real: boolean };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ m?: string; view?: string; kind?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const kind: "rec" | "ent" | null = sp.kind === "rec" || sp.kind === "ent" ? sp.kind : null;
  const now = new Date();
  const [yy, mm] = sp.m ? sp.m.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const year = yy;
  const month = mm - 1;

  const projetos = await prisma.projeto.findMany({ include: { episodios: { orderBy: { idx: "asc" } } } });

  // ── construir eventos (rec ↓ / entrega ↑), cor por projeto ──
  const evs: Ev[] = [];
  projetos.forEach((p, idx) => {
    // cor por projeto: respeita uma cor escolhida (≠ azul default), senão espalha
    // deterministicamente pelo id para dar variedade (o default azul repetia-se).
    const color = p.color && p.color.toLowerCase() !== "#2563eb" ? p.color : projColor(p.id);
    const href = `/producao/${p.id}`;
    if (p.eps > 0 && p.episodios.length) {
      p.episodios.forEach((e, i) => {
        const rec = e.recReal ?? e.rec;
        const ent = e.entregaReal ?? e.entrega;
        if (rec) evs.push({ day: toDateInput(rec), kind: "rec", label: `${p.titulo} Ep.${i + 1}`, color, href, real: !!e.recReal });
        if (ent) evs.push({ day: toDateInput(ent), kind: "ent", label: `${p.titulo} Ep.${i + 1}`, color, href, real: !!e.entregaReal });
      });
    } else if (p.recepcao || p.recepcaoReal || p.prazo || p.entregaReal) {
      const rec = p.recepcaoReal ?? p.recepcao; // receção real quando existe, senão a planeada
      if (rec) evs.push({ day: toDateInput(rec), kind: "rec", label: p.titulo, color, href, real: !!p.recepcaoReal });
      const ent = p.entregaReal ?? p.prazo; // entrega real quando existe, senão o prazo planeado
      if (ent) evs.push({ day: toDateInput(ent), kind: "ent", label: p.titulo, color, href, real: !!p.entregaReal });
    }
  });

  // filtro por tipo (receções / entregas), se ativo
  const evsF = kind ? evs.filter((e) => e.kind === kind) : evs;

  const byDay = new Map<string, Ev[]>();
  for (const e of evsF) {
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
  // href preservando vista / mês / filtro (passar null limpa esse parâmetro)
  const qs = (over: { view?: string; m?: string | null; kind?: string | null }) => {
    const p = new URLSearchParams();
    p.set("view", over.view ?? view);
    const mm = over.m !== undefined ? over.m : sp.m;
    if (mm) p.set("m", mm);
    const k = over.kind !== undefined ? over.kind : kind;
    if (k) p.set("kind", k);
    return `/calendario?${p.toString()}`;
  };

  // eventos visíveis (para a lista por baixo), agrupados por projeto+label
  const visibleDays = new Set(cells.map((d) => toDateInput(d)));
  const visEvs = evsF.filter((e) => visibleDays.has(e.day));
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
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={qs({ m: prevM })} className="btn btn-ghost btn-sm"><i className="ti ti-chevron-left" /></Link>
          <Link href={qs({ m: null })} className="btn btn-ghost btn-sm">Hoje</Link>
          <Link href={qs({ m: nextM })} className="btn btn-ghost btn-sm"><i className="ti ti-chevron-right" /></Link>
          <div className={styles.viewToggle}>
            <Link href={qs({ kind: null })} className={!kind ? styles.vActive : ""}>Ambos</Link>
            <Link href={qs({ kind: "rec" })} className={kind === "rec" ? styles.vActive : ""}>↓ Receções</Link>
            <Link href={qs({ kind: "ent" })} className={kind === "ent" ? styles.vActive : ""}>↑ Entregas</Link>
          </div>
          <div className={styles.viewToggle}>
            <Link href={qs({ view: "week" })} className={view === "week" ? styles.vActive : ""}>Semana</Link>
            <Link href={qs({ view: "month" })} className={view === "month" ? styles.vActive : ""}>Mês</Link>
          </div>
        </div>
      }
    >
      <div className={styles.calScroll}>
        <div className={styles.weekHead}>
          {DIAS.map((d) => <div key={d} className={styles.weekDay}>{d}</div>)}
        </div>
        <div className={styles.grid}>
          {cells.map((d, i) => {
            const ds = toDateInput(d);
            const out = view === "month" && d.getUTCMonth() !== month;
            const dayEvs = byDay.get(ds) ?? [];
            // Limite de eventos por dia (semana mostra mais) — o resto vai para
            // "+N mais" e continua listado por baixo, para não esticar a linha.
            const cap = view === "week" ? 12 : 4;
            const shown = dayEvs.slice(0, cap);
            const extra = dayEvs.length - shown.length;
            return (
              <div key={i} className={`${styles.cell} ${out ? styles.out : ""} ${ds === todayStr ? styles.today : ""}`}>
                <div className={styles.dayNum}>{d.getUTCDate()}</div>
                {shown.map((e, j) => {
                  const ent = e.kind === "ent";
                  return (
                    <Link
                      key={j}
                      href={e.href}
                      className={styles.ev}
                      style={
                        ent
                          ? { background: e.color, borderLeft: `3px solid ${e.color}`, color: "#fff", fontWeight: 600 }
                          : { background: `${e.color}14`, borderLeft: `3px dashed ${e.color}`, color: "var(--ink)" }
                      }
                      title={`${e.label} — ${ent ? "Entrega" : "Receção"}${e.real ? "" : " (prevista)"}`}
                    >
                      <span style={{ color: ent ? "#fff" : e.color, fontWeight: 800 }}>{ent ? "↑" : "↓"}</span> {e.label}
                    </Link>
                  );
                })}
                {extra > 0 && <span className={styles.more}>+{extra} mais</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legItem}>
          <span className={styles.legRec} /> <span className={styles.arrow}>↓</span> Receção
        </span>
        <span className={styles.legItem}>
          <span className={styles.legEnt} /> <span className={styles.arrow}>↑</span> Entrega
        </span>
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
