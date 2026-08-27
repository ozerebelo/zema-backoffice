import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ProjetoForm } from "@/components/ProjetoForm";
import { DeleteButton } from "@/components/DeleteButton";
import { updateProjeto, deleteProjeto } from "../../projeto-actions";
import { toDateInput } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EditarProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [p, clientes] = await Promise.all([
    prisma.projeto.findUnique({ where: { id }, include: { linhas: { orderBy: { idx: "asc" } } } }),
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);
  if (!p) notFound();

  const update = updateProjeto.bind(null, id);
  const del = deleteProjeto.bind(null, id);

  return (
    <Page
      title="Editar projeto"
      sub={p.titulo}
      actions={
        <Link href={`/producao/${id}`} className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ProjetoForm
        action={update}
        clientes={clientes}
        submitLabel="Guardar alterações"
        initial={{
          titulo: p.titulo,
          clienteId: p.clienteId,
          tipo: p.tipo,
          formato: p.formato,
          camera: p.camera,
          dp: p.dp,
          duracao: p.duracao,
          eps: p.eps,
          valEp: p.valEp == null ? null : Number(p.valEp),
          valor: Number(p.valor),
          fase: p.fase,
          recepcao: toDateInput(p.recepcao),
          prazo: toDateInput(p.prazo),
          internacional: p.internacional,
          notas: p.notas,
          color: p.color,
          linhas: p.linhas.map((x) => ({
            descricao: x.descricao,
            valEp: x.valEp == null ? null : Number(x.valEp),
            valor: Number(x.valor),
            incluida: x.incluida,
          })),
        }}
      />

      <DeleteButton
        action={del}
        confirmText={`Apagar o projeto "${p.titulo}"? Episódios e recibos associados são removidos. Esta ação é irreversível.`}
        className="btn btn-ghost btn-sm"
        formStyle={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--red)" }}>
          <i className="ti ti-trash" /> Apagar projeto
        </span>
      </DeleteButton>
    </Page>
  );
}
