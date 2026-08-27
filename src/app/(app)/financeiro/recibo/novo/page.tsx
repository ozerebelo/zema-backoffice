import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { createRecibo } from "../../actions";
import formStyles from "@/components/form.module.css";

export const dynamic = "force-dynamic";

export default async function NovoReciboPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string }>;
}) {
  const sp = await searchParams;
  const todos = await prisma.projeto.findMany({
    include: { cliente: true, recibos: { select: { valor: true } } },
    orderBy: { titulo: "asc" },
  });
  // Só projetos por faturar (sem recibo ou parcialmente faturados). Os já
  // totalmente faturados saem da lista — exceto o pré-selecionado por link.
  const cents = (n: unknown) => Math.round(Number(n) * 100);
  const projetos = todos.filter((p) => {
    if (p.id === sp.projeto) return true;
    const faturado = p.recibos.reduce((s, r) => s + cents(r.valor), 0);
    return faturado < cents(p.valor);
  });
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Page
      title="Emitir recibo"
      actions={
        <Link href="/financeiro?tab=recibos" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <form action={createRecibo} className={formStyles.form}>
        <div className={formStyles.grid}>
          <label className={formStyles.full}>
            <span>Projeto *</span>
            <select name="projetoId" required defaultValue={sp.projeto ?? ""}>
              <option value="">— escolher projeto —</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}{p.cliente ? ` · ${p.cliente.nome}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Valor (€) *</span>
            <input name="valor" type="number" step="0.01" min={0} required placeholder="Ex: 1600" />
          </label>

          <label>
            <span>Data *</span>
            <input name="data" type="date" required defaultValue={hoje} />
          </label>

          <label>
            <span>Taxa IRS</span>
            <input name="taxaIRS" type="number" step="0.01" defaultValue={0.23} />
          </label>

          <label>
            <span>Taxa IVA</span>
            <input name="taxaIVA" type="number" step="0.01" defaultValue={0.23} />
          </label>

          <label className={formStyles.full}>
            <span>Notas</span>
            <input name="notas" placeholder="Ex: 1ª parcela" />
          </label>

          <label className={`${formStyles.full} ${formStyles.check}`}>
            <input type="checkbox" name="internacional" />
            <span>Internacional — sem IVA nem IRS (ignora as taxas)</span>
          </label>

          <label className={`${formStyles.full} ${formStyles.check}`} style={{ background: "var(--blue-bg)" }}>
            <input type="checkbox" name="pago" />
            <span style={{ color: "var(--blue-fg)" }}>Já recebido</span>
          </label>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className="btn btn-red">
            <i className="ti ti-check" /> Emitir recibo
          </button>
        </div>
      </form>
    </Page>
  );
}
