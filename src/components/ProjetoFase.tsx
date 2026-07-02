"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  quickSetProjetoFase,
  setProjetoData,
  setProjetoEntregaReal,
  setProjetoRecepcaoReal,
  setProjetoReview,
} from "@/app/(app)/producao/projeto-actions";
import { PROD_PHASES_SHORT, faseLabel } from "@/lib/domain";
import { ReviewControl } from "./ReviewControl";
import ep from "./episode.module.css";

const SHORT = ["CF", "GR", "VIS", "DL", "✓"];

/** Controlo de fase para projetos sem episódios. Espelha o EpisodeCard:
 *  date-picker de entrega real (marca entregue) + strip de fases. */
export function ProjetoFase({
  projetoId,
  fase,
  recepcao,
  recepcaoReal,
  prazo,
  entregaReal,
  reviewStatus,
  reviewRound,
}: {
  projetoId: string;
  fase: number;
  recepcao: string | null;
  recepcaoReal: string | null;
  prazo: string | null;
  entregaReal: string | null;
  reviewStatus: string | null;
  reviewRound: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const delivered = fase >= 4;
  const materialChegou = !!recepcaoReal;
  const aguardaMaterial = fase === 0 && !materialChegou && !delivered;

  function review(a: "feedback" | "reentregar" | "aprovar" | "reabrir") {
    setBusy(true);
    start(async () => {
      await setProjetoReview(projetoId, a);
      router.refresh();
      setBusy(false);
    });
  }

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
  function setRecepcao(value: string) {
    setBusy(true);
    start(async () => {
      await setProjetoRecepcaoReal(projetoId, value || null);
      router.refresh();
      setBusy(false);
    });
  }
  function setPlan(field: "recepcao" | "prazo", value: string) {
    setBusy(true);
    start(async () => {
      await setProjetoData(projetoId, field, value || null);
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
        <span className={ep.epNum}>{aguardaMaterial ? "Aguarda material" : faseLabel(fase)}</span>
        <span className={`badge ${delivered ? "badge-green" : "badge-grey"}`}>
          {PROD_PHASES_SHORT[fase] ?? PROD_PHASES_SHORT[0]}
        </span>
      </div>

      <div className={ep.grid}>
        <label className={ep.field}>
          <span>Receção prevista</span>
          <input type="date" defaultValue={recepcao ?? ""} onChange={(e) => setPlan("recepcao", e.target.value)} />
        </label>
        <label className={ep.field}>
          <span className={ep.real}>Receção real</span>
          <input type="date" defaultValue={recepcaoReal ?? ""} onChange={(e) => setRecepcao(e.target.value)} />
        </label>
        <label className={ep.field}>
          <span>Entrega prevista</span>
          <input type="date" defaultValue={prazo ?? ""} onChange={(e) => setPlan("prazo", e.target.value)} />
        </label>
        <label className={ep.field}>
          <span className={ep.real}>Entrega real</span>
          <input type="date" defaultValue={entregaReal ?? ""} onChange={(e) => setEntrega(e.target.value)} />
        </label>
      </div>

      <div className={ep.faseRow}>
        {SHORT.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`${ep.faseBtn} ${i === fase && !(i === 0 && !materialChegou) ? ep.faseActive : ""}`}
            onClick={() => setFase(i)}
            disabled={pending || busy}
            title={PROD_PHASES_SHORT[i]}
          >
            {s}
          </button>
        ))}
      </div>

      <ReviewControl
        status={reviewStatus}
        round={reviewRound}
        disabled={pending || busy}
        onAction={review}
      />
    </div>
  );
}
