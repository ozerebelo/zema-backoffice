import Link from "next/link";
import { calcProjStatus, getNextDeadline, urgencyFromDeadline, PCOLORS, PSHORT } from "@/lib/producao";
import { quickSetProjetoFase } from "@/app/(app)/producao/projeto-actions";
import { fmtMoney } from "@/lib/dates";
import styles from "./projeto-card.module.css";

type Ep = { fase: number; entrega: Date | null; entregaReal: Date | null };
type Proj = {
  id: string;
  titulo: string;
  fase: number;
  eps: number;
  valor: number;
  prazo: Date | null;
  dp: string | null;
  cliente: string | null;
  episodios: Ep[];
  faturado: number;
};

export function ProjetoCard({ p }: { p: Proj }) {
  const status = calcProjStatus(p);
  const urg = urgencyFromDeadline(getNextDeadline(p));
  const total = p.eps ?? 0;
  const eps = [...p.episodios];
  while (eps.length < total) eps.push({ fase: 0, entrega: null, entregaReal: null });

  const pct = p.valor > 0 ? Math.min(100, Math.round((p.faturado / p.valor) * 100)) : 0;
  const finColor = pct >= 100 ? "#059669" : pct > 0 ? "#2563EB" : "var(--border)";

  return (
    <Link
      href={`/producao/${p.id}`}
      className={styles.card}
      style={{ border: urg ? `2px solid ${urg.color}` : "1px solid var(--border)" }}
    >
      {urg && <div className={styles.urg} style={{ background: urg.color }}>{urg.label}</div>}

      <div className={styles.head} style={{ marginTop: urg ? 10 : 0 }}>
        <div className={styles.title}>{p.titulo}</div>
        <span className={styles.phase} style={{ background: status.color }}>{PSHORT[status.fase]}</span>
      </div>
      <div className={styles.cli}>
        {p.cliente ?? "—"}
        {p.dp ? <em className={styles.dp}> · {p.dp}</em> : null}
      </div>

      {/* Episode strip */}
      {total > 0 && total <= 16 && (
        <div className={styles.strip}>
          {eps.map((e, i) => (
            <div key={i} className={styles.seg} style={{ background: PCOLORS[Math.min(e.fase ?? 0, 4)] }} title={`Ep.${i + 1}`} />
          ))}
        </div>
      )}
      {total > 16 && (
        <div className={styles.pills}>
          {PSHORT.map((ph, pi) => {
            const c = status.counts[pi];
            return c ? <span key={pi} className={styles.pill} style={{ background: PCOLORS[pi] }}>{c} {ph}</span> : null;
          })}
        </div>
      )}

      {/* Phase quick-advance (non-episodic) */}
      {total === 0 && (
        <div className={styles.phaseBtns}>
          {PSHORT.slice(0, 4).map((ph, i) => {
            const cur = p.fase === i;
            const done = p.fase > i;
            return (
              <form key={i} action={quickSetProjetoFase.bind(null, p.id, i)} style={{ flex: 1 }}>
                <button
                  type="submit"
                  className={styles.phaseBtn}
                  style={{
                    border: `1px solid ${cur ? PCOLORS[i] : "var(--border)"}`,
                    background: cur ? PCOLORS[i] : done ? "rgba(18,40,76,.07)" : "transparent",
                    color: cur ? "#fff" : done ? "var(--ink)" : "var(--text-muted)",
                  }}
                >
                  {ph}
                </button>
              </form>
            );
          })}
        </div>
      )}

      {/* Financial summary */}
      {p.valor > 0 ? (
        <div className={styles.fin}>
          <div className={styles.finRow}>
            <span className={styles.finLabel}>{p.faturado > 0 ? `${fmtMoney(p.faturado)} faturado` : fmtMoney(p.valor)}</span>
            {p.faturado > 0 && p.faturado < p.valor && <span className={styles.finRest}>resta {fmtMoney(p.valor - p.faturado)}</span>}
            {p.faturado >= p.valor && p.valor > 0 && <span className={styles.finDone}>✓ Faturado</span>}
          </div>
          {p.faturado > 0 && (
            <div className={styles.bar}><div className={styles.barFill} style={{ width: `${pct}%`, background: finColor }} /></div>
          )}
        </div>
      ) : (
        <div className={styles.valOnly}>{fmtMoney(p.valor)}</div>
      )}
    </Link>
  );
}
