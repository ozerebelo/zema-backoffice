// Cálculo de impostos e IVA trimestral.
// Réplica fiel de calcImpostos / quarter helpers do backoffice v4.35.

export const DEFAULT_IRS = 0.23;
export const DEFAULT_IVA = 0.23;

export interface Impostos {
  bruto: number;
  iva: number;
  irs: number;
  liquido: number;
  taxaIRS: number;
  taxaIVA: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Internacional ⇒ sem IRS/IVA (reverse charge).
 * Nacional ⇒ IRS + IVA (default 23%, override por recibo).
 * bruto = valor + IVA;  liquido = valor − IRS.
 */
export function calcImpostos(
  valor: number,
  internacional: boolean,
  taxaIRS?: number | null,
  taxaIVA?: number | null
): Impostos {
  if (internacional) {
    return { bruto: valor, iva: 0, irs: 0, liquido: valor, taxaIRS: 0, taxaIVA: 0 };
  }
  const tIRS = taxaIRS != null ? Number(taxaIRS) : DEFAULT_IRS;
  const tIVA = taxaIVA != null ? Number(taxaIVA) : DEFAULT_IVA;
  const iva = round2(valor * tIVA);
  const irs = round2(valor * tIRS);
  return {
    bruto: round2(valor + iva),
    iva,
    irs,
    liquido: round2(valor - irs),
    taxaIRS: tIRS,
    taxaIVA: tIVA,
  };
}

// ─── IVA trimestral ──────────────────────────────────────────────
export function getQuarter(date: Date): number {
  return Math.ceil((date.getMonth() + 1) / 3);
}

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Pagamento IVA: dia 15 do mês seguinte ao fim do trimestre (Q4 → 15 Jan ano+1). */
export function quarterDeadlineDate(year: number, q: number): Date {
  const m = [0, 3, 6, 9, 0][q]; // Q1→Abr, Q2→Jul, Q3→Out, Q4→Jan
  const y = q === 4 ? year + 1 : year;
  return new Date(y, m, 15);
}

export function quarterDeadlineLabel(year: number, q: number): string {
  const m = [0, 3, 6, 9, 0][q];
  const y = q === 4 ? year + 1 : year;
  return `15 ${MONTHS_PT[m]} ${y}`;
}

export const quarterLabel = (year: number, q: number) => `Q${q} ${year}`;
export const ivaStateKey = (year: number, q: number) => `iva_${year}_${q}`;
