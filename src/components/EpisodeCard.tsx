"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEpisodeDate, setEpisodeExtra, setEpisodeFase, setEpisodeReview } from "@/app/(app)/producao/[id]/actions";
import { removeEpisode } from "@/app/(app)/producao/projeto-actions";
import { PROD_PHASES_SHORT } from "@/lib/domain";
import { ReviewControl } from "./ReviewControl";
import styles from "./episode.module.css";

type Ep = {
  id: string;
  idx: number;
  rec: string | null;
  entrega: string | null;
  recReal: string | null;
  entregaReal: string | null;
  fase: number;
  pontualidade: string | null;
  reviewStatus: string | null;
  reviewRound: number;
  extra: number;
  extraNota: string | null;
};

const SHORT = ["CF", "GR", "VIS", "DL", "✓"];

export function EpisodeCard({ ep }: { ep: Ep }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState(String(ep.extra || ""));
  const [extraNota, setExtraNota] = useState(ep.extraNota ?? "");

  function saveExtra() {
    const val = Number(extra) || 0;
    if (val === (ep.extra || 0) && (extraNota.trim() || null) === (ep.extraNota ?? null)) return;
    setBusy(true);
    start(async () => {
      await setEpisodeExtra(ep.id, val, extraNota || null);
      router.refresh();
      setBusy(false);
    });
  }

  function update(field: "rec" | "entrega" | "recReal" | "entregaReal", value: string) {
    setBusy(true);
    start(async () => {
      await setEpisodeDate(ep.id, field, value || null);
      router.refresh();
      setBusy(false);
    });
  }
  function setFase(f: number) {
    setBusy(true);
    start(async () => {
      await setEpisodeFase(ep.id, f);
      router.refresh();
      setBusy(false);
    });
  }
  function remove() {
    if (!confirm(`Remover o Ep. ${ep.idx + 1}?`)) return;
    setBusy(true);
    start(async () => {
      await removeEpisode(ep.id);
      router.refresh();
      setBusy(false);
    });
  }
  function review(a: "feedback" | "reentregar" | "aprovar" | "reabrir") {
    setBusy(true);
    start(async () => {
      await setEpisodeReview(ep.id, a);
      router.refresh();
      setBusy(false);
    });
  }

  const delivered = !!ep.entregaReal;
  const materialChegou = !!ep.recReal;
  const aguardaMaterial = ep.fase === 0 && !materialChegou; // CF só acende com material

  return (
    <div className={`${styles.card} ${delivered ? styles.done : ""}`} aria-busy={pending || busy}>
      <div className={styles.head}>
        <span className={styles.epNum}>Ep. {ep.idx + 1}</span>
        <div className={styles.tags}>
          {ep.pontualidade && (
            <span className={`badge ${ep.pontualidade === "no prazo" ? "badge-green" : "badge-red"}`}>
              {ep.pontualidade}
            </span>
          )}
          <span className={`badge ${delivered ? "badge-green" : "badge-grey"}`}>
            {aguardaMaterial ? "Aguarda material" : (PROD_PHASES_SHORT[ep.fase] ?? PROD_PHASES_SHORT[0])}
          </span>
          <button
            type="button"
            className={styles.remove}
            onClick={remove}
            disabled={pending || busy}
            title="Remover episódio"
            aria-label="Remover episódio"
          >
            <i className="ti ti-x" />
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Receção prevista</span>
          <input type="date" defaultValue={ep.rec ?? ""} onChange={(e) => update("rec", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.real}>Receção real</span>
          <input type="date" defaultValue={ep.recReal ?? ""} onChange={(e) => update("recReal", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Entrega prevista</span>
          <input type="date" defaultValue={ep.entrega ?? ""} onChange={(e) => update("entrega", e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.real}>Entrega real</span>
          <input
            type="date"
            defaultValue={ep.entregaReal ?? ""}
            onChange={(e) => update("entregaReal", e.target.value)}
          />
        </label>
      </div>

      <div className={styles.faseRow}>
        {SHORT.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.faseBtn} ${i === ep.fase && !(i === 0 && !materialChegou) ? styles.faseActive : ""}`}
            onClick={() => setFase(i)}
            disabled={pending || busy}
            title={PROD_PHASES_SHORT[i]}
          >
            {s}
          </button>
        ))}
      </div>

      <div className={styles.extraRow}>
        <label className={styles.extraVal}>
          <span>Horas extra €</span>
          <input
            type="number"
            step="0.01"
            min={0}
            placeholder="0"
            value={extra}
            disabled={pending || busy}
            onChange={(e) => setExtra(e.target.value)}
            onBlur={saveExtra}
          />
        </label>
        <label className={styles.extraNota}>
          <span>Descrição</span>
          <input
            type="text"
            placeholder="ex.: 3h correções cliente"
            value={extraNota}
            disabled={pending || busy}
            onChange={(e) => setExtraNota(e.target.value)}
            onBlur={saveExtra}
          />
        </label>
      </div>

      <ReviewControl
        status={ep.reviewStatus}
        round={ep.reviewRound}
        disabled={pending || busy}
        onAction={review}
      />
    </div>
  );
}
