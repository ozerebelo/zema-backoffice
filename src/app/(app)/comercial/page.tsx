import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { LeadKanban } from "@/components/LeadKanban";
import { isLeadTerminal } from "@/lib/domain";
import { fmtMoney } from "@/lib/dates";
import styles from "./comercial.module.css";

export const dynamic = "force-dynamic";

export default async function ComercialPage() {
  const leads = await prisma.lead.findMany({
    include: { cliente: true, linhas: { orderBy: { idx: "asc" } } },
  });

  const ativos = leads.filter((l) => !isLeadTerminal(l.estado));
  const ganhos = leads.filter((l) => l.estado === "ganho");
  const perdidos = leads.filter((l) => l.estado === "perdido");
  const decididos = ganhos.length + perdidos.length;
  const taxa = decididos > 0 ? Math.round((ganhos.length / decididos) * 100) : null;

  const cards = ativos.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    cliente: l.cliente?.nome ?? null,
    valor: Number(l.valor),
    estado: l.estado,
    tipo: l.tipo,
    linhas: l.linhas.map((x) => ({
      descricao: x.descricao,
      valor: Number(x.valor),
      incluida: x.incluida,
    })),
  }));

  const stats = [
    { label: "Em aberto", value: String(ativos.length), sub: `${fmtMoney(ativos.reduce((s, l) => s + Number(l.valor), 0))} potencial`, color: "#2563EB" },
    { label: "Ganhos", value: String(ganhos.length), sub: `${fmtMoney(ganhos.reduce((s, l) => s + Number(l.valor), 0))} convertido`, color: "#059669" },
    { label: "Perdidos", value: String(perdidos.length), sub: `${fmtMoney(perdidos.reduce((s, l) => s + Number(l.valor), 0))} perdido`, color: "#DC4A36" },
    { label: "Taxa de conversão", value: taxa == null ? "—" : `${taxa}%`, sub: decididos ? `${ganhos.length}/${decididos} decididos` : "sem decisões", color: "#7C3AED" },
  ];

  return (
    <Page
      title="Pipeline comercial"
      sub={`${ativos.length} em aberto`}
      actions={
        <Link href="/comercial/novo" className="btn btn-red btn-sm">
          <i className="ti ti-plus" /> Novo lead
        </Link>
      }
    >
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ padding: "13px 15px", borderTop: `3px solid ${s.color}` }}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <LeadKanban leads={cards} />
    </Page>
  );
}
