"use client";

import { REVIEW, reviewLabel, type ReviewStatus } from "@/lib/domain";

type Action = "feedback" | "reentregar" | "aprovar" | "reabrir";

/** Badge de estado de revisão + botões contextuais. Só aparece depois de
 *  entregue (status != null). Genérico: serve episódio e projeto. */
export function ReviewControl({
  status,
  round,
  disabled,
  onAction,
}: {
  status: string | null;
  round: number;
  disabled?: boolean;
  onAction: (a: Action) => void;
}) {
  if (!status || !(status in REVIEW)) return null;
  const meta = REVIEW[status as ReviewStatus];

  const btns: { a: Action; label: string; primary?: boolean }[] =
    status === "aguarda_feedback"
      ? [{ a: "feedback", label: "Voltou c/ feedback" }, { a: "aprovar", label: "Aprovar", primary: true }]
      : status === "em_revisao"
      ? [{ a: "reentregar", label: "Reentregar" }, { a: "aprovar", label: "Aprovar", primary: true }]
      : [{ a: "reabrir", label: "Reabrir" }];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: meta.color,
          border: `1px solid ${meta.color}55`,
          background: `${meta.color}14`,
          borderRadius: 20,
          padding: "2px 8px",
          whiteSpace: "nowrap",
        }}
      >
        {reviewLabel(status, round)}
      </span>
      <span style={{ flex: 1 }} />
      {btns.map((b) => (
        <button
          key={b.a}
          type="button"
          disabled={disabled}
          onClick={() => onAction(b.a)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "3px 9px",
            borderRadius: 6,
            border: b.primary ? "none" : "1px solid var(--border-strong)",
            background: b.primary ? "#059669" : "transparent",
            color: b.primary ? "#fff" : "var(--text-secondary)",
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
