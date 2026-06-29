import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ProjetoForm } from "@/components/ProjetoForm";
import { createProjeto } from "../projeto-actions";

export const dynamic = "force-dynamic";

export default async function NovoProjetoPage() {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <Page
      title="Novo projeto"
      actions={
        <Link href="/producao" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ProjetoForm action={createProjeto} clientes={clientes} submitLabel="Criar projeto" />
    </Page>
  );
}
