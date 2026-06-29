// Agregações financeiras partilhadas (dashboard + financeiro).
// Bruto = valor + IVA (nacional) | valor (internacional)
// Líquido = valor − IRS (nacional) | valor (internacional)
import { calcImpostos } from "./tax";

export type ReciboLike = {
  valor: unknown;
  internacional: boolean;
  pago: boolean;
  taxaIRS: unknown;
  taxaIVA: unknown | null;
  data: Date;
};

export function reciboImpostos(r: ReciboLike) {
  return calcImpostos(
    Number(r.valor),
    r.internacional,
    Number(r.taxaIRS),
    r.taxaIVA == null ? null : Number(r.taxaIVA)
  );
}

export interface YearSummary {
  bruto: number;
  liquido: number;
  cobrado: number; // líquido já recebido (pago)
  porCobrar: number; // líquido ainda por receber
  base: number;
  iva: number;
  irs: number;
  internacional: number;
  n: number;
}

export function yearSummary(recibos: ReciboLike[], year: number): YearSummary {
  const s: YearSummary = {
    bruto: 0, liquido: 0, cobrado: 0, porCobrar: 0,
    base: 0, iva: 0, irs: 0, internacional: 0, n: 0,
  };
  for (const r of recibos) {
    if (r.data.getUTCFullYear() !== year) continue;
    const t = reciboImpostos(r);
    const v = Number(r.valor);
    s.bruto += t.bruto;
    s.liquido += t.liquido;
    s.iva += t.iva;
    s.irs += t.irs;
    if (r.internacional) s.internacional += v;
    else s.base += v;
    if (r.pago) s.cobrado += t.liquido;
    else s.porCobrar += t.liquido;
    s.n += 1;
  }
  return s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export function roundSummary(s: YearSummary): YearSummary {
  return {
    bruto: round2(s.bruto), liquido: round2(s.liquido),
    cobrado: round2(s.cobrado), porCobrar: round2(s.porCobrar),
    base: round2(s.base), iva: round2(s.iva), irs: round2(s.irs),
    internacional: round2(s.internacional), n: s.n,
  };
}
