"use client";

import { useState } from "react";
import styles from "./form.module.css";

type Contacto = { nome?: string; cargo?: string | null; email?: string | null; tel?: string | null };
type Initial = {
  empresa?: string;
  nome?: string;
  nif?: string | null;
  email?: string | null;
  tel?: string | null;
  notas?: string | null;
  contactos?: Contacto[];
};

export function ClienteForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  initial?: Initial;
  submitLabel: string;
}) {
  const [contactos, setContactos] = useState<Contacto[]>(
    initial?.contactos && initial.contactos.length ? initial.contactos : [{}]
  );

  return (
    <form action={action} className={styles.form}>
      <div className={styles.grid}>
        <label>
          <span>Nome / empresa *</span>
          <input name="nome" required defaultValue={initial?.nome ?? ""} placeholder="Ex: Moving Pictures" />
        </label>
        <label>
          <span>Empresa (razão social)</span>
          <input name="empresa" defaultValue={initial?.empresa ?? ""} placeholder="Opcional" />
        </label>
        <label>
          <span>NIF</span>
          <input name="nif" defaultValue={initial?.nif ?? ""} />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" defaultValue={initial?.email ?? ""} />
        </label>
        <label>
          <span>Telefone</span>
          <input name="tel" defaultValue={initial?.tel ?? ""} />
        </label>
        <label className={styles.full}>
          <span>Notas</span>
          <textarea name="notas" rows={2} defaultValue={initial?.notas ?? ""} placeholder="Ex: reverse charge, condições…" />
        </label>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className={styles.valueHead}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Contactos
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setContactos((c) => [...c, {}])}>
            <i className="ti ti-plus" /> Contacto
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {contactos.map((ct, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 0.9fr auto", gap: 6, alignItems: "center" }}>
              <input name="cNome" defaultValue={ct.nome ?? ""} placeholder="Nome" className={styles.contactInput} />
              <input name="cCargo" defaultValue={ct.cargo ?? ""} placeholder="Cargo" className={styles.contactInput} />
              <input name="cEmail" defaultValue={ct.email ?? ""} placeholder="Email" className={styles.contactInput} />
              <input name="cTel" defaultValue={ct.tel ?? ""} placeholder="Telefone" className={styles.contactInput} />
              <button type="button" className={styles.contactRemove} title="Remover"
                onClick={() => setContactos((c) => (c.length > 1 ? c.filter((_, j) => j !== i) : c))}>
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-red"><i className="ti ti-check" /> {submitLabel}</button>
      </div>
    </form>
  );
}
