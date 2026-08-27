// Linhas de orçamento (base SDR + extra HDR, etc.) partilhadas por leads e
// projetos. O valor da proposta é a soma das linhas INCLUÍDAS; sem linhas,
// mantém-se o valor único de sempre.

export type LinhaInput = {
  idx: number;
  descricao: string;
  valEp: number | null;
  valor: number;
  incluida: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Total de uma linha: por episódio multiplica pelo nº de episódios. */
export function totalLinha(l: { valEp: unknown; valor: unknown }, eps: number): number {
  const valEp = l.valEp == null ? null : Number(l.valEp);
  return round2(valEp != null ? valEp * Math.max(0, eps) : Number(l.valor));
}

/** Soma das linhas incluídas. */
export function totalLinhas(
  linhas: { valEp: unknown; valor: unknown; incluida: boolean }[],
  eps: number
): number {
  return round2(linhas.filter((l) => l.incluida).reduce((s, l) => s + totalLinha(l, eps), 0));
}

/** Lê as linhas submetidas pelo formulário (arrays paralelos lDesc/lValEp/…). */
export function readLinhas(fd: FormData, eps: number): LinhaInput[] {
  const descs = fd.getAll("lDesc").map(String);
  const valEps = fd.getAll("lValEp").map(String);
  const valores = fd.getAll("lValor").map(String);
  const incls = fd.getAll("lIncl").map(String);

  const out: LinhaInput[] = [];
  for (let i = 0; i < descs.length; i++) {
    const descricao = descs[i]?.trim();
    const valEpRaw = valEps[i]?.trim();
    const valEp = valEpRaw ? Number(valEpRaw) : null;
    const valorRaw = Number(valores[i]) || 0;
    // linha vazia (sem descrição e sem valor) é ignorada
    if (!descricao && !valEp && !valorRaw) continue;
    const linha = {
      idx: out.length,
      descricao: descricao || "—",
      valEp: valEp != null && Number.isFinite(valEp) ? valEp : null,
      valor: 0,
      incluida: incls[i] !== "0",
    };
    // guarda sempre o total já calculado, para leitura direta
    linha.valor = totalLinha({ valEp: linha.valEp, valor: valorRaw }, eps);
    out.push(linha);
  }
  return out;
}
