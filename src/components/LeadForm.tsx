"use client";

import { useState } from "react";
import { TIPOS, FORMATOS, LEAD_STAGES } from "@/lib/domain";
import styles from "./form.module.css";

type Cliente = { id: string; nome: string };
type Initial = {
  titulo?: string;
  clienteId?: string | null;
  tipo?: string | null;
  formato?: string | null;
  camera?: string | null;
  duracao?: string | null;
  eps?: number;
  valEp?: number | null;
  valor?: number;
  estado?: string;
  internacional?: boolean;
  notas?: string | null;
};

const fmt = (v: number) =>
  "€" + v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function withCurrent(list: readonly string[], current?: string | null) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

export function LeadForm({
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
  const [mode, setMode] = useState<"total" | "perEp">(initial?.valEp != null ? "perEp" : "total");
  const [eps, setEps] = useState(initial?.eps ?? 0);
  const [valEp, setValEp] = useState(initial?.valEp ?? 0);
  const [valor, setValor] = useState(initial?.valor ?? 0);
  const computedTotal = Math.round(eps * valEp * 100) / 100;

  return (
    <form action={action} className={styles.form}>
      <div className={styles.grid}>
        <label className={styles.full}>
          <span>Título *</span>
          <input name="titulo" required defaultValue={initial?.titulo ?? ""} placeholder="Ex: Documentário X" />
        </label>

        <label>
          <span>Cliente</span>
          <select name="clienteId" defaultValue={initial?.clienteId ?? ""}>
            <option value="">— sem cliente —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>

        <label>
          <span>Estágio</span>
          <select name="estado" defaultValue={initial?.estado ?? "contacto_inicial"}>
            {LEAD_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>

        <label>
          <span>Tipo</span>
          <select name="tipo" defaultValue={initial?.tipo ?? "Outro"}>
            {withCurrent(TIPOS, initial?.tipo).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label>
          <span>Formato</span>
          <select name="formato" defaultValue={initial?.formato ?? "Outro"}>
            {withCurrent(FORMATOS, initial?.formato).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>

        <label>
          <span>Câmara</span>
          <input name="camera" defaultValue={initial?.camera ?? ""} placeholder="Ex: Sony Burano" />
        </label>

        <label>
          <span>Duração</span>
          <input name="duracao" defaultValue={initial?.duracao ?? ""} placeholder="Ex: 20 seg." />
        </label>

        <label>
          <span>Nº episódios</span>
          <input name="eps" type="number" min={0} value={eps}
            onChange={(e) => setEps(Math.max(0, Math.trunc(Number(e.target.value) || 0)))} />
        </label>

        <div className={styles.full}>
          <div className={styles.valueHead}>
            <span>Valor</span>
            <div className={styles.toggle}>
              <button type="button" className={mode === "total" ? styles.toggleActive : ""} onClick={() => setMode("total")}>Total</button>
              <button type="button" className={mode === "perEp" ? styles.toggleActive : ""} onClick={() => setMode("perEp")}>Por episódio</button>
            </div>
          </div>
          <input type="hidden" name="valueMode" value={mode} />
          {mode === "total" ? (
            <input name="valor" type="number" step="0.01" min={0} value={valor}
              onChange={(e) => setValor(Number(e.target.value) || 0)} placeholder="Ex: 600" />
          ) : (
            <div className={styles.perEpRow}>
              <input name="valEp" type="number" step="0.01" min={0} value={valEp}
                onChange={(e) => setValEp(Number(e.target.value) || 0)} placeholder="€ / episódio" />
              <span className={styles.times}>× {eps} eps =</span>
              <strong className={styles.total}>{fmt(computedTotal)}</strong>
            </div>
          )}
        </div>

        <label className={styles.full}>
          <span>Notas</span>
          <textarea name="notas" rows={3} defaultValue={initial?.notas ?? ""} placeholder="Detalhes da proposta…" />
        </label>

        <label className={`${styles.full} ${styles.check}`}>
          <input type="checkbox" name="internacional" defaultChecked={initial?.internacional ?? false} />
          <span>Internacional — sem IVA nem IRS</span>
        </label>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-red"><i className="ti ti-check" /> {submitLabel}</button>
      </div>
    </form>
  );
}
