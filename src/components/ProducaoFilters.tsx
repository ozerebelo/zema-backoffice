"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./projeto-card.module.css";

export function ProducaoFilters({ clientes, anos }: { clientes: { id: string; nome: string }[]; anos: number[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/producao?${next.toString()}`);
  }

  return (
    <div className={styles.filters}>
      <input
        className={styles.filterSearch}
        placeholder="Pesquisar projeto…"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => set("q", e.target.value)}
      />
      <select className={styles.filterSel} defaultValue={sp.get("fase") ?? "all"} onChange={(e) => set("fase", e.target.value)}>
        <option value="all">Todas as fases</option>
        <option value="0">Conform / Ingest</option>
        <option value="1">Sessão 1</option>
        <option value="2">Sessão 2</option>
        <option value="3">Deliverables</option>
      </select>
      <select className={styles.filterSel} defaultValue={sp.get("cli") ?? "all"} onChange={(e) => set("cli", e.target.value)}>
        <option value="all">Todos os clientes</option>
        {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select className={styles.filterSel} defaultValue={sp.get("ano") ?? "all"} onChange={(e) => set("ano", e.target.value)}>
        <option value="all">Todos os anos</option>
        {anos.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className={styles.filterSel} defaultValue={sp.get("sort") ?? "prazo"} onChange={(e) => set("sort", e.target.value)}>
        <option value="prazo">↑ Prazo</option>
        <option value="alpha">Alfabético</option>
        <option value="valor">Valor</option>
        <option value="fase">Fase</option>
      </select>
    </div>
  );
}
