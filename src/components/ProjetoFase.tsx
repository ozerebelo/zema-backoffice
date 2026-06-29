"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  quickSetProjetoFase,
  setProjetoEntregaReal,
} from "@/app/(app)/producao/projeto-actions";
import { PROD_PHASES_SHORT, faseLabel } from "@/lib/domain";
import ep from "./episode.module.css";

const SHORT = ["CF", "S1", "S2", "DL", "✓"];

/** Controlo de fase para projetos sem episódios. Espelha o EpisodeCard:
 *  date-picker de entrega real (marca entregue) + strip de fases. */
export function ProjetoFase({
  projetoId,
  fase,
  entregaReal,
  prazoLabel,
}: {
  projetoId: string;
  fase: number;
  entregaReal: string | null;
  prazoLabel: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const delivered = fase >= 4;

  function setFase(f: number) {
    setBusy(true);
    start(async () => {
      await quickSetProjetoFase(projetoId, f);
      router.refresh();
      setBusy(false);
    });
  }
  function setEntrega(value: string) {
    setBusy(true);
    start(async () => {
      await setProjetoEntregaReal(projetoId, value || null);
      router.refresh();
      setBusy(false);
    });
  }

  return (
    <div
      className={`${ep.card} ${delivered ? ep.done : ""}`}
      aria-busy={pending || busy}
    >
      <div className={ep.head}>
        <span className={ep.epNum}>{faseLabel(fase)}</span>
        <span className={`badge ${delivered ? "badge-green" : "badge-grey"}`}>
          {PROD_PHASES_SHORT[fase] ?? PROD_PHASES_SHORT[0]}
        </span>
      </div>

      <div className={ep.grid}>
        <label className={ep.field}>
          <span className={ep.real}>Entrega real</span>
          <input
            type="date"
            defaultValue={entregaReal ?? ""}
            onChange={(e) => setEntrega(e.target.value)}
          />
        </label>
        {prazoLabel && (
          <div className={ep.field}>
            <span>Prazo</span>
            <div style={{ fontSize: 12, padding: "5px 1px", color: "var(--text-secondary)" }}>
              {prazoLabel}
            </div>
          </div>
        )}
      </div>

      <div className={ep.faseRow}>
        {SHORT.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`${ep.faseBtn} ${i === fase ? ep.faseActive : ""}`}
            onClick={() => setFase(i)}
            disabled={pending || busy}
            title={PROD_PHASES_SHORT[i]}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
