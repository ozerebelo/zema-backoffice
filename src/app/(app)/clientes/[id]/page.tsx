import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { PROD_PHASES } from "@/lib/domain";
import { fmtMoney } from "@/lib/dates";
import styles from "./cliente.module.css";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.cliente.findUnique({
    where: { id },
    include: {
      contactos: true,
      projetos: {
        orderBy: { titulo: "asc" },
        include: { recibos: { select: { valor: true, pago: true } } },
      },
      leads: { orderBy: { titulo: "asc" } },
    },
  });
  if (!c) notFound();

  // Resumo financeiro do cliente (agregado dos seus projetos).
  let contratado = 0, faturado = 0, porFaturar = 0, porReceber = 0;
  for (const p of c.projetos) {
    const fat = p.recibos.reduce((s, r) => s + Number(r.valor), 0);
    const naoPago = p.recibos.filter((r) => !r.pago).reduce((s, r) => s + Number(r.valor), 0);
    contratado += Number(p.valor);
    faturado += fat;
    porFaturar += Math.max(0, Number(p.valor) - fat);
    porReceber += naoPago;
  }
  const resumo = [
    { label: "Contratado", value: contratado, color: "var(--ink)" },
    { label: "Faturado", value: faturado, color: "var(--green-fg)" },
    { label: "Por faturar", value: porFaturar, color: "#7C3AED" },
    { label: "Por receber", value: porReceber, color: "var(--red)" },
  ];

  return (
    <Page
      title={c.nome}
      sub={c.nif ? `NIF ${c.nif}` : undefined}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/clientes/${id}/editar`} className="btn btn-ghost btn-sm">
            <i className="ti ti-edit" /> Editar
          </Link>
          <Link href="/clientes" className="btn btn-ghost btn-sm">
            <i className="ti ti-arrow-left" /> Voltar
          </Link>
        </div>
      }
    >
      <div className={styles.layout}>
        <div>
          {c.projetos.length > 0 && (
            <div
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
                padding: "14px 16px",
                marginBottom: 22,
              }}
            >
              {resumo.map((r) => (
                <div key={r.label}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: r.color, marginTop: 2 }}>
                    {fmtMoney(r.value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.section}>Contactos</div>
          <div className="card" style={{ marginBottom: 22 }}>
            {c.contactos.length === 0 && <div className={styles.empty}>Sem contactos</div>}
            {c.contactos.map((ct) => (
              <div className={styles.contactRow} key={ct.id}>
                <div>
                  <div className={styles.contactName}>{ct.nome}</div>
                  {ct.cargo && <div className={styles.contactRole}>{ct.cargo}</div>}
                </div>
                <div className={styles.contactMeta}>
                  {ct.email && <a href={`mailto:${ct.email}`}>{ct.email}</a>}
                  {ct.tel && <span>{ct.tel}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.section}>Projetos ({c.projetos.length})</div>
          <div className="card">
            {c.projetos.length === 0 && <div className={styles.empty}>Sem projetos</div>}
            {c.projetos.map((p) => (
              <Link href={`/producao/${p.id}`} className={styles.projRow} key={p.id}>
                <span style={{ flex: 1 }}>{p.titulo}</span>
                <span className={styles.projPhase}>{PROD_PHASES[p.fase]}</span>
                <strong>{fmtMoney(Number(p.valor))}</strong>
              </Link>
            ))}
          </div>
        </div>

        <aside>
          {(c.email || c.tel || c.morada || c.notas) && (
            <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
              {c.morada && <div className={styles.infoRow}><span>Morada</span><b>{c.morada}</b></div>}
              {c.email && <div className={styles.infoRow}><span>Email</span><a href={`mailto:${c.email}`}>{c.email}</a></div>}
              {c.tel && <div className={styles.infoRow}><span>Tel</span><b>{c.tel}</b></div>}
              {c.notas && <div className={styles.notas}>{c.notas}</div>}
            </div>
          )}
          {c.leads.length > 0 && (
            <div className="card">
              <div className={styles.sideHead}>Leads em aberto</div>
              {c.leads.map((l) => (
                <Link href={`/comercial/${l.id}/editar`} className={styles.projRow} key={l.id}>
                  <span style={{ flex: 1 }}>{l.titulo}</span>
                  <strong>{fmtMoney(Number(l.valor))}</strong>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
}
