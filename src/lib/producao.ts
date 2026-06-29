// Lógica de estado/urgência de projetos (porta de calcProjStatus / getNextDeadline / urgencyFromDeadline).
export const PCOLORS = ["#8a9ab5", "#2563EB", "#D97706", "#7C3AED", "#059669"];
export const PSHORT = ["CF", "S1", "S2", "DL", "✓"];
export const PNAMES = ["Conform", "Sess.1", "Sess.2", "Delivers", "Entregue"];

export type EpLite = { fase: number; entrega: Date | null; entregaReal: Date | null };
export type ProjLite = { fase: number; eps: number; prazo: Date | null; episodios: EpLite[] };

export function calcProjStatus(p: ProjLite) {
  const eps = p.episodios ?? [];
  if (!eps.length || !p.eps) {
    return { label: PNAMES[p.fase] ?? PNAMES[0], color: PCOLORS[p.fase] ?? PCOLORS[0], fase: p.fase ?? 0, counts: [0, 0, 0, 0, 0] };
  }
  const counts = [0, 0, 0, 0, 0];
  eps.forEach((e) => (counts[Math.min(e.fase ?? 0, 4)] += 1));
  let active = 4;
  for (let i = 0; i < 4; i++) if (counts[i] > 0) { active = i; break; }
  return { label: PNAMES[active], color: PCOLORS[active], fase: active, counts };
}

/** Data da próxima entrega pendente, ou null. */
export function getNextDeadline(p: ProjLite): Date | null {
  const eps = p.episodios ?? [];
  if (p.eps > 1) {
    const pend = eps.filter((e) => (e.fase ?? 0) < 4 && e.entrega).map((e) => e.entrega!) as Date[];
    if (!pend.length) return null;
    pend.sort((a, b) => a.getTime() - b.getTime());
    return pend[0];
  }
  if (p.eps === 1) {
    return eps[0]?.entrega ?? p.prazo ?? null;
  }
  return p.prazo ?? null;
}

export type Urgency = { label: string; color: string; diff: number } | null;

export function urgencyFromDeadline(d: Date | null): Urgency {
  if (!d) return null;
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((b - a) / 86_400_000);
  const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const mo = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const dl = `${wd[d.getUTCDay()]}, ${d.getUTCDate()} ${mo[d.getUTCMonth()]}`;
  if (diff < 0) return { label: `Atrasado ${Math.abs(diff)}d`, color: "#DC4A36", diff };
  if (diff === 0) return { label: "Entrega hoje", color: "#DC4A36", diff };
  if (diff <= 3) return { label: `Entrega em ${diff}d`, color: "#DC4A36", diff };
  if (diff <= 7) return { label: dl, color: "#D97706", diff };
  if (diff <= 14) return { label: dl, color: "#2563EB", diff };
  return null;
}
