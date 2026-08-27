"use client";

import { useState, type FormEvent } from "react";
import { fmtMoney } from "@/lib/dates";
import formStyles from "./form.module.css";

export type ProjetoOpt = { id: string; label: string; restante: number };

export type EmitenteOpt = { id: string; label: string };

type Initial = {
  projetoId?: string;
  emitente?: string;
  valor?: number;
  data?: string;
  taxaIRS?: number;
  taxaIVA?: number;
  notas?: string;
  internacional?: boolean;
  pago?: boolean;
  dataPagamento?: string;
  semRecibo?: boolean;
};

export function ReciboForm({
  action,
  projetos,
  emitentes,
  initial,
  edit = false,
  hoje,
  submitLabel = "Emitir recibo",
}: {
  action: (fd: FormData) => void | Promise<void>;
  projetos: ProjetoOpt[];
  emitentes: EmitenteOpt[];
  initial?: Initial;
  edit?: boolean;
  hoje: string;
  submitLabel?: string;
}) {
  const [projetoId, setProjetoId] = useState(initial?.projetoId ?? "");
  const [valor, setValor] = useState(initial?.valor != null ? String(initial.valor) : "");
  const [autofilled, setAutofilled] = useState(false);
  const [pago, setPago] = useState(initial?.pago ?? false);
  const [dataPag, setDataPag] = useState(initial?.dataPagamento ?? initial?.data ?? hoje);

  const sel = projetos.find((p) => p.id === projetoId);
  const restante = sel ? sel.restante : null;
  const excede = restante != null && Number(valor) > restante + 0.005;

  function onProjeto(id: string) {
    setProjetoId(id);
    // Pré-preenche com o que falta faturar (só em criação, e se o valor estiver
    // vazio ou tiver sido preenchido automaticamente numa escolha anterior).
    if (!edit) {
      const opt = projetos.find((p) => p.id === id);
      if (opt && (valor === "" || autofilled)) {
        setValor(opt.restante > 0 ? String(opt.restante) : "");
        setAutofilled(true);
      }
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (excede) {
      const ok = window.confirm(
        `Vais faturar ${fmtMoney(Number(valor))}, acima do que falta faturar neste projeto (${fmtMoney(
          restante!
        )}). Continuar?`
      );
      if (!ok) e.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} className={formStyles.form}>
      <div className={formStyles.grid}>
        <label className={formStyles.full}>
          <span>Projeto *</span>
          <select
            name="projetoId"
            required
            value={projetoId}
            onChange={(e) => onProjeto(e.target.value)}
          >
            <option value="">— escolher projeto —</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.full}>
          <span>Emitente *</span>
          <select name="emitente" required defaultValue={initial?.emitente ?? emitentes[0]?.id ?? ""}>
            {emitentes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Valor (€) *</span>
          <input
            name="valor"
            type="number"
            step="0.01"
            min={0}
            required
            placeholder="Ex: 1600"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setAutofilled(false);
            }}
          />
          {restante != null && (
            <small
              style={{
                marginTop: 4,
                fontSize: 11,
                color: excede ? "var(--red)" : "var(--text-muted)",
              }}
            >
              {excede
                ? `⚠ Acima do que falta faturar (${fmtMoney(restante)})`
                : `Falta faturar: ${fmtMoney(restante)}`}
            </small>
          )}
        </label>

        <label>
          <span>Data *</span>
          <input name="data" type="date" required defaultValue={initial?.data ?? hoje} />
        </label>

        <label>
          <span>Taxa IRS</span>
          <input name="taxaIRS" type="number" step="0.01" defaultValue={initial?.taxaIRS ?? 0.23} />
        </label>

        <label>
          <span>Taxa IVA</span>
          <input name="taxaIVA" type="number" step="0.01" defaultValue={initial?.taxaIVA ?? 0.23} />
        </label>

        <label className={formStyles.full}>
          <span>Notas</span>
          <input name="notas" placeholder="Ex: 1ª parcela" defaultValue={initial?.notas ?? ""} />
        </label>

        <label className={`${formStyles.full} ${formStyles.check}`}>
          <input type="checkbox" name="internacional" defaultChecked={initial?.internacional ?? false} />
          <span>Internacional — sem IVA nem IRS (ignora as taxas)</span>
        </label>

        <label className={`${formStyles.full} ${formStyles.check}`}>
          <input type="checkbox" name="semRecibo" defaultChecked={initial?.semRecibo ?? false} />
          <span>Sem recibo emitido — pagamento sem documento fiscal (fica fora do CSV para a contabilidade)</span>
        </label>

        <label className={`${formStyles.full} ${formStyles.check}`} style={{ background: "var(--blue-bg)" }}>
          <input
            type="checkbox"
            name="pago"
            checked={pago}
            onChange={(e) => setPago(e.target.checked)}
          />
          <span style={{ color: "var(--blue-fg)" }}>Já recebido</span>
        </label>

        {pago && (
          <label>
            <span>Data de recebimento</span>
            <input
              name="dataPagamento"
              type="date"
              value={dataPag}
              onChange={(e) => setDataPag(e.target.value)}
            />
            <small style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
              Conta para o ano em que o dinheiro entrou
            </small>
          </label>
        )}
      </div>

      <div className={formStyles.actions}>
        <button type="submit" className="btn btn-red">
          <i className="ti ti-check" /> {submitLabel}
        </button>
      </div>
    </form>
  );
}
