"use client";

import { useState } from "react";
import styles from "./orcamento.module.css";

export type Linha = {
  descricao: string;
  valEp: number | null; // preenchido = valor por episódio
  valor: number; // total da linha
  incluida: boolean;
};

const fmt = (v: number) =>
  "€" + v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Total de uma linha: por episódio multiplica pelo nº de episódios. */
export function totalLinha(l: Linha, eps: number): number {
  const base = l.valEp != null ? l.valEp * Math.max(0, eps) : l.valor;
  return Math.round(base * 100) / 100;
}

/**
 * Linhas de orçamento (ex.: "Base SDR" + "Extra HDR"). Cada linha pode ser um
 * valor total ou por episódio, e ser incluída/excluída conforme o cliente
 * aceite. O valor da proposta é a soma das incluídas.
 */
export function OrcamentoLinhas({
  eps,
  linhas,
  setLinhas,
}: {
  eps: number;
  linhas: Linha[];
  setLinhas: (l: Linha[]) => void;
}) {
  const [aberto, setAberto] = useState(linhas.length > 0);

  function update(i: number, patch: Partial<Linha>) {
    setLinhas(linhas.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }
  function add() {
    setAberto(true);
    setLinhas([...linhas, { descricao: "", valEp: null, valor: 0, incluida: true }]);
  }
  function remove(i: number) {
    setLinhas(linhas.filter((_, k) => k !== i));
  }

  const total = linhas
    .filter((l) => l.incluida)
    .reduce((s, l) => s + totalLinha(l, eps), 0);

  if (!aberto && linhas.length === 0) {
    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.addEmpty} onClick={add}>
          <i className="ti ti-plus" /> Dividir em linhas de orçamento (ex.: base SDR + extra HDR)
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>Linhas de orçamento</span>
        <button type="button" className={styles.add} onClick={add}>
          <i className="ti ti-plus" /> Linha
        </button>
      </div>

      {linhas.map((l, i) => {
        const porEp = l.valEp != null;
        return (
          <div key={i} className={`${styles.row} ${l.incluida ? "" : styles.rowOff}`}>
            <input type="hidden" name="lDesc" value={l.descricao} />
            <input type="hidden" name="lValEp" value={porEp ? String(l.valEp) : ""} />
            <input type="hidden" name="lValor" value={String(l.valor)} />
            <input type="hidden" name="lIncl" value={l.incluida ? "1" : "0"} />

            <input
              type="checkbox"
              checked={l.incluida}
              onChange={(e) => update(i, { incluida: e.target.checked })}
              title={l.incluida ? "Incluída no total" : "Proposta mas não aceite"}
            />

            <input
              className={styles.desc}
              placeholder="Ex: Base SDR"
              value={l.descricao}
              onChange={(e) => update(i, { descricao: e.target.value })}
            />

            <input
              className={styles.val}
              type="number"
              step="0.01"
              min={0}
              placeholder={porEp ? "€/ep" : "€"}
              value={porEp ? (l.valEp ?? 0) : l.valor}
              onChange={(e) => {
                const n = Number(e.target.value) || 0;
                update(i, porEp ? { valEp: n } : { valor: n });
              }}
            />

            <button
              type="button"
              className={`${styles.epBtn} ${porEp ? styles.epOn : ""}`}
              onClick={() =>
                update(
                  i,
                  porEp
                    ? { valEp: null, valor: totalLinha(l, eps) }
                    : { valEp: l.valor, valor: 0 }
                )
              }
              title={porEp ? "Por episódio — clicar para valor total" : "Valor total — clicar para por episódio"}
            >
              /ep
            </button>

            <span className={styles.sub}>
              {porEp ? `× ${eps} = ${fmt(totalLinha(l, eps))}` : ""}
            </span>

            <button type="button" className={styles.del} onClick={() => remove(i)} title="Remover linha">
              <i className="ti ti-x" />
            </button>
          </div>
        );
      })}

      <div className={styles.totalRow}>
        <span>Total da proposta</span>
        <strong>{fmt(total)}</strong>
      </div>
    </div>
  );
}
