"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePropostaEstado } from "@/app/(app)/financeiro/actions";
import { FIN_STATES } from "@/lib/domain";
import type { FinState } from "@prisma/client";

export function PropostaEstadoSelect({ id, estado }: { id: string; estado: FinState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={estado}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updatePropostaEstado(id, e.target.value as FinState);
          router.refresh();
        })
      }
      style={{
        padding: "4px 8px",
        fontSize: 12,
        border: "1px solid var(--border-strong)",
        borderRadius: 6,
        background: "var(--white)",
        color: "var(--text-primary)",
      }}
    >
      {FIN_STATES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
