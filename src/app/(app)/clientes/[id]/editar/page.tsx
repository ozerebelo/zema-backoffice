import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ClienteForm } from "@/components/ClienteForm";
import { DeleteButton } from "@/components/DeleteButton";
import { updateCliente, deleteCliente } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.cliente.findUnique({ where: { id }, include: { contactos: true } });
  if (!c) notFound();

  const update = updateCliente.bind(null, id);
  const del = deleteCliente.bind(null, id);

  return (
    <Page
      title="Editar cliente"
      sub={c.nome}
      actions={
        <Link href={`/clientes/${id}`} className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ClienteForm
        action={update}
        submitLabel="Guardar alterações"
        initial={{
          empresa: c.empresa,
          nome: c.nome,
          nif: c.nif,
          email: c.email,
          tel: c.tel,
          notas: c.notas,
          contactos: c.contactos.map((ct) => ({ nome: ct.nome, cargo: ct.cargo, email: ct.email, tel: ct.tel })),
        }}
      />

      <DeleteButton
        action={del}
        confirmText={`Apagar o cliente "${c.nome}"? Os contactos são removidos e os projetos ficam sem cliente. Esta ação é irreversível.`}
        className="btn btn-ghost btn-sm"
        formStyle={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--red)" }}>
          <i className="ti ti-trash" /> Apagar cliente
        </span>
      </DeleteButton>
    </Page>
  );
}
