import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { LeadForm } from "@/components/LeadForm";
import { createLead } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovoLeadPage() {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  return (
    <Page
      title="Novo lead"
      actions={
        <Link href="/comercial" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <LeadForm action={createLead} clientes={clientes} submitLabel="Criar lead" />
    </Page>
  );
}
