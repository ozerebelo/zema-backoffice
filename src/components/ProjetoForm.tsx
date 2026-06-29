"use client";

import { useState } from "react";
import { TIPOS, FORMATOS, PROD_PHASES } from "@/lib/domain";
import styles from "./form.module.css";

type Cliente = { id: string; nome: string };
type Initial = {
  titulo?: string;
  clienteId?: string | null;
  tipo?: string | null;
  formato?: string | null;
  camera?: string | null;
  dp?: string | null;
  duracao?: string | null;
  eps?: number;
  valEp?: number | null;
  valor?: number;
  fase?: number;
  recepcao?: string;
  prazo?: string;
  internacional?: boolean;
  notas?: string | null;
  color?: string | null;
};

const fmt = (v: number) =>
  "€" + v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function withCurrent(list: readonly string[], current?: string | null) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

export function ProjetoForm({
  action,
  clientes,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  clientes: Cliente[];
  initial?: Initial;
  submitLabel: string;
}) {
  const [mode, setMode] = useState<"total" | "perEp">(
    initial?.valEp != null ? "perEp" : "total"
  );
  const [eps, setEps] = useState(initial?.eps ?? 0);
  const [valEp, setValEp] = useState(initial?.valEp ?? 0);
  const [valor, setValor] = useState(initial?.valor ?? 0);

  const computedTotal = Math.round(eps * valEp * 100) / 100;

  return (
    <form action={action} className={styles.form}>
      <div className={styles.grid}>
        <label className={styles.full}>
          <span>Título *</span>
          <input name="titulo" required defaultValue={initial?.titulo ?? ""} placeholder="Ex: First Date" />
        </label>

        <label>
          <span>Cliente</span>
          <select name="clienteId" defaultValue={initial?.clienteId ?? ""}>
            <option value="">— sem cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Tipo</span>
          <select name="tipo" defaultValue={initial?.tipo ?? "Outro"}>
            {withCurrent(TIPOS, initial?.tipo).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Formato</span>
          <select name="formato" defaultValue={initial?.formato ?? "Outro"}>
            {withCurrent(FORMATOS, initial?.formato).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Câmara</span>
          <input name="camera" defaultValue={initial?.camera ?? ""} placeholder="Ex: ARRI Alexa Mini" />
        </label>

        <label>
          <span>Diretor de fotografia</span>
          <input name="dp" defaultValue={initial?.dp ?? ""} placeholder="Ex: João Silva" />
        </label>

        <label>
          <span>Duração</span>
          <input name="duracao" defaultValue={initial?.duracao ?? ""} placeholder="Ex: 8 eps × 45 min" />
        </label>

        <label>
          <span>Nº episódios</span>
          <input
            name="eps"
            type="number"
            min={0}
            value={eps}
            onChange={(e) => setEps(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
          />
        </label>

        {/* Valor: por episódio ou total */}
        <div className={styles.full}>
          <div className={styles.valueHead}>
            <span>Valor</span>
            <div className={styles.toggle}>
              <button
                type="button"
                className={mode === "total" ? styles.toggleActive : ""}
                onClick={() => setMode("total")}
              >
                Total
              </button>
              <button
                type="button"
                className={mode === "perEp" ? styles.toggleActive : ""}
                onClick={() => setMode("perEp")}
              >
                Por episódio
              </button>
            </div>
          </div>
          <input type="hidden" name="valueMode" value={mode} />

          {mode === "total" ? (
            <input
              name="valor"
              type="number"
              step="0.01"
              min={0}
              value={valor}
              onChange={(e) => setValor(Number(e.target.value) || 0)}
              placeholder="Ex: 1600"
            />
          ) : (
            <div className={styles.perEpRow}>
              <input
                name="valEp"
                type="number"
                step="0.01"
                min={0}
                value={valEp}
                onChange={(e) => setValEp(Number(e.target.value) || 0)}
                placeholder="€ / episódio"
              />
              <span className={styles.times}>× {eps} eps =</span>
              <strong className={styles.total}>{fmt(computedTotal)}</strong>
            </div>
          )}
        </div>

        <label>
          <span>Receção de material</span>
          <input name="recepcao" type="date" defaultValue={initial?.recepcao ?? ""} />
        </label>

        <label>
          <span>Prazo de entrega</span>
          <input name="prazo" type="date" defaultValue={initial?.prazo ?? ""} />
        </label>

        <label>
          <span>Fase atual</span>
          <select name="fase" defaultValue={String(initial?.fase ?? 0)}>
            {PROD_PHASES.map((ph, i) => (
              <option key={i} value={i}>{ph}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Cor</span>
          <input name="color" type="color" defaultValue={initial?.color ?? "#2563EB"} className={styles.color} />
        </label>

        <label className={styles.full}>
          <span>Notas criativas / look</span>
          <textarea name="notas" rows={3} defaultValue={initial?.notas ?? ""} placeholder="Referências de look, decisões criativas…" />
        </label>

        <label className={`${styles.full} ${styles.check}`}>
          <input type="checkbox" name="internacional" defaultChecked={initial?.internacional ?? false} />
          <span>Projeto internacional — sem IVA nem IRS</span>
        </label>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-red">
          <i className="ti ti-check" /> {submitLabel}
        </button>
      </div>
    </form>
  );
}
