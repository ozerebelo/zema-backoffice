"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setLeadEstado } from "@/app/(app)/comercial/actions";
import { LEAD_STAGES } from "@/lib/domain";
import type { LeadStage } from "@prisma/client";
import styles from "./kanban.module.css";

type Lead = {
  id: string;
  titulo: string;
  cliente: string | null;
  valor: number;
  estado: LeadStage;
  tipo: string | null;
};

const fmt = (v: number) => "€" + v.toLocaleString("pt-PT");

export function LeadKanban({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  async function drop(estado: LeadStage) {
    setOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.estado === estado) return;
    await setLeadEstado(id, estado);
    router.refresh();
  }

  return (
    <div className={styles.board}>
      {LEAD_STAGES.map((stage) => {
        const items = leads.filter((l) => l.estado === stage.value);
        return (
          <div
            key={stage.value}
            className={`${styles.col} ${over === stage.value ? styles.colOver : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(stage.value); }}
            onDragLeave={() => setOver((o) => (o === stage.value ? null : o))}
            onDrop={() => drop(stage.value)}
          >
            <div className={styles.colHead}>
              <span className={styles.colTitle}>{stage.label}</span>
              <span className={styles.count}>{items.length}</span>
            </div>
            {items.map((l) => (
              <div
                key={l.id}
                className={styles.card}
                draggable
                onDragStart={() => setDragId(l.id)}
                onDragEnd={() => { setDragId(null); setOver(null); }}
              >
                <Link href={`/comercial/${l.id}/editar`} className={styles.cardTitle}>{l.titulo}</Link>
                <div className={styles.cardCli}>{l.cliente ?? "—"}{l.tipo ? ` · ${l.tipo}` : ""}</div>
                <div className={styles.cardVal}>{fmt(l.valor)}</div>
              </div>
            ))}
            {items.length === 0 && <div className={styles.colEmpty}>—</div>}
          </div>
        );
      })}
    </div>
  );
}
