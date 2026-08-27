import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { reciboImpostos, reciboNumero } from "@/lib/finance";
import { fmtMoney } from "@/lib/dates";
import { getEmitente, LOGO_SRC } from "@/lib/emitente";
import { PrintButton } from "@/components/PrintButton";
import styles from "./recibo.module.css";

export const dynamic = "force-dynamic";

const fmtData = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

/** 0.23 → "23%" */
const pct = (taxa: number) => `${Math.round(taxa * 1000) / 10}%`;

export default async function ReciboImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.recibo.findUnique({
    where: { id },
    include: { projeto: { include: { cliente: true } } },
  });
  if (!r) notFound();

  const imp = reciboImpostos(r);
  const num = reciboNumero(r);
  const cliente = r.projeto?.cliente;
  const emitente = getEmitente(r.emitente);
  // Documento para o cliente: o IVA acresce e o IRS é retido por ele, logo o
  // que transfere é base + IVA − retenção (≠ do "líquido" interno, base − IRS).
  const aTransferir = Math.round((imp.bruto - imp.irs) * 100) / 100;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <PrintButton />
        <span className={styles.hint}>Usa &quot;Guardar como PDF&quot; na janela de impressão</span>
      </div>

      <div className={styles.sheet}>
        <header className={styles.head}>
          {LOGO_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_SRC} alt={emitente.nome} className={styles.logo} />
          ) : (
            <svg className={styles.logo} viewBox="0 0 150 78" role="img" aria-label="zema studios" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="34" fill="#12284C" fontFamily="var(--font-dm-sans), sans-serif" fontWeight="600" fontSize="38" letterSpacing="-1">zema</text>
              <text x="0" y="74" fill="#12284C" fontFamily="var(--font-dm-sans), sans-serif" fontWeight="600" fontSize="38" letterSpacing="-1">
                stud<tspan fill="#E1573F">i</tspan>os
              </text>
            </svg>
          )}
          <div className={styles.emit}>
            <b>{emitente.nome}</b>
            <br />
            {emitente.morada}
            <br />
            NIF <b>{emitente.nif}</b>
            {(emitente.email || emitente.tel) && (
              <>
                <br />
                {[emitente.email, emitente.tel].filter(Boolean).join(" · ")}
              </>
            )}
          </div>
        </header>

        <div className={styles.docmeta}>
          <h1 className={styles.docTitle}>Recibo</h1>
          <div className={styles.num}>
            Nº <b>{num}</b>
            <br />
            Data <b>{fmtData(r.data)}</b>
          </div>
        </div>

        <div className={styles.party}>
          <div className={styles.partyK}>Cliente</div>
          <div className={styles.partyName}>{cliente?.nome ?? r.projeto?.cliente?.empresa ?? "—"}</div>
          <div className={styles.partyMeta}>
            {[cliente?.nif ? `NIF ${cliente.nif}` : null, cliente?.morada]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th className={styles.r}>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>{r.projeto?.titulo ?? "—"}</b>
                {r.notas ? <div className={styles.small}>{r.notas}</div> : null}
              </td>
              <td className={styles.r}>{fmtMoney(Number(r.valor))}</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.totals}>
          <table>
            <tbody>
              <tr>
                <td className={styles.lbl}>Base tributável</td>
                <td className={styles.r}>{fmtMoney(Number(r.valor))}</td>
              </tr>
              {!r.internacional && (
                <>
                  <tr>
                    <td className={styles.lbl}>IVA ({pct(imp.taxaIVA)})</td>
                    <td className={styles.r}>{fmtMoney(imp.iva)}</td>
                  </tr>
                  <tr>
                    <td className={styles.lbl}>Total c/ IVA</td>
                    <td className={styles.r}>{fmtMoney(imp.bruto)}</td>
                  </tr>
                  <tr>
                    <td className={styles.lbl}>Retenção na fonte IRS ({pct(imp.taxaIRS)})</td>
                    <td className={`${styles.r} ${styles.neg}`}>− {fmtMoney(imp.irs)}</td>
                  </tr>
                </>
              )}
              <tr className={styles.grand}>
                <td className={styles.lbl}>Valor a transferir</td>
                <td className={`${styles.r} ${styles.val}`}>{fmtMoney(aTransferir)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.note}>
          {r.internacional
            ? "Operação internacional — reverse charge (sem IVA nem IRS)."
            : emitente.notaFiscal}
          {emitente.iban && (
            <>
              <br />
              Pagamento por transferência — IBAN {emitente.iban}.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
