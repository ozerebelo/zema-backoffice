import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { LeadKanban } from "@/components/LeadKanban";

export const dynamic = "force-dynamic";

export default async function ComercialPage() {
  const leads = await prisma.lead.findMany({ include: { cliente: true } });
  const cards = leads.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    cliente: l.cliente?.nome ?? null,
    valor: Number(l.valor),
    estado: l.estado,
    tipo: l.tipo,
  }));

  return (
    <Page
      title="Pipeline comercial"
      sub={`${leads.length} leads`}
      actions={
        <Link href="/comercial/novo" className="btn btn-red btn-sm">
          <i className="ti ti-plus" /> Novo lead
        </Link>
      }
    >
      <LeadKanban leads={cards} />
    </Page>
  );
}
