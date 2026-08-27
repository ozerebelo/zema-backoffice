"use client";

import { useRef, useState } from "react";
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
  linhas: { descricao: string; valor: number; incluida: boolean }[];
};

const fmt = (v: number) => "€" + v.toLocaleString("pt-PT");

export function LeadKanban({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  // Distinguir clique de arrasto: o cartão inteiro abre a edição, mas arrastar
  // para mudar de coluna não deve navegar.
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const arrastou = useRef(false);

  function abrir(id: string, e: React.MouseEvent) {
    if (arrastou.current) return; // foi arrasto
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return; // rato mexeu
    if ((e.target as HTMLElement).closest("a")) return; // link tratou do clique
    router.push(`/comercial/${id}/editar`);
  }

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
                onMouseDown={(e) => { downAt.current = { x: e.clientX, y: e.clientY }; arrastou.current = false; }}
                onDragStart={() => { arrastou.current = true; setDragId(l.id); }}
                onDragEnd={() => { setDragId(null); setOver(null); }}
                onClick={(e) => abrir(l.id, e)}
                title="Clicar para editar · arrastar para mudar de fase"
              >
                <div className={styles.cardHead}>
                  <span className={styles.cardTitle}>{l.titulo}</span>
                  <Link
                    href={`/comercial/${l.id}/editar`}
                    className={styles.cardEdit}
                    title="Editar lead"
                    draggable={false}
                  >
                    <i className="ti ti-edit" />
                  </Link>
                </div>
                <div className={styles.cardCli}>{l.cliente ?? "—"}{l.tipo ? ` · ${l.tipo}` : ""}</div>
                {/* Com linhas, mostra a decomposição (ex.: SDR + HDR), não só o total */}
                {l.linhas.length > 0 && (
                  <div className={styles.linhas}>
                    {l.linhas.map((ln, k) => (
                      <div key={k} className={`${styles.linha} ${ln.incluida ? "" : styles.linhaOff}`}>
                        <span className={styles.linhaDesc}>
                          {ln.incluida ? "" : "✕ "}{ln.descricao}
                        </span>
                        <span className={styles.linhaVal}>{fmt(ln.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
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
