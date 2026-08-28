"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./projeto-card.module.css";

export function ClientesFilter() {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/clientes?${next.toString()}`);
  }

  return (
    <div className={styles.filters}>
      <input
        className={styles.filterSearch}
        placeholder="Pesquisar cliente, NIF, contacto…"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => set("q", e.target.value)}
      />
      <select
        className={styles.filterSel}
        defaultValue={sp.get("fiscal") ?? "all"}
        onChange={(e) => set("fiscal", e.target.value)}
      >
        <option value="all">Todos</option>
        <option value="incompletos">Sem NIF ou morada</option>
      </select>
    </div>
  );
}
