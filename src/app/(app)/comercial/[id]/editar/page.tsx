import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { LeadForm } from "@/components/LeadForm";
import { DeleteButton } from "@/components/DeleteButton";
import { updateLead, deleteLead, promoteLead, marcarLeadPerdido, reabrirLead } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, clientes] = await Promise.all([
    prisma.lead.findUnique({ where: { id } }),
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);
  if (!l) notFound();

  const update = updateLead.bind(null, id);
  const del = deleteLead.bind(null, id);
  const promote = promoteLead.bind(null, id);
  const perdido = marcarLeadPerdido.bind(null, id);
  const reabrir = reabrirLead.bind(null, id);
  const terminal = l.estado === "ganho" || l.estado === "perdido";

  return (
    <Page
      title="Editar lead"
      sub={l.titulo}
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {terminal ? (
            <>
              <span className={`badge ${l.estado === "ganho" ? "badge-green" : "badge-red"}`}>
                {l.estado === "ganho" ? "Ganho" : "Perdido"}
              </span>
              <form action={reabrir}>
                <button type="submit" className="btn btn-ghost btn-sm">
                  <i className="ti ti-rotate" /> Reabrir
                </button>
              </form>
            </>
          ) : (
            <>
              <form action={promote}>
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="ti ti-arrow-up-right" /> Promover a produção
                </button>
              </form>
              <form action={perdido}>
                <button type="submit" className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }}>
                  <i className="ti ti-target-off" /> Marcar perdido
                </button>
              </form>
            </>
          )}
          <Link href="/comercial" className="btn btn-ghost btn-sm">
            <i className="ti ti-arrow-left" /> Voltar
          </Link>
        </div>
      }
    >
      <LeadForm
        action={update}
        clientes={clientes}
        submitLabel="Guardar alterações"
        initial={{
          titulo: l.titulo,
          clienteId: l.clienteId,
          tipo: l.tipo,
          formato: l.formato,
          camera: l.camera,
          duracao: l.duracao,
          eps: l.eps,
          valEp: l.valEp == null ? null : Number(l.valEp),
          valor: Number(l.valor),
          estado: l.estado,
          internacional: l.internacional,
          notas: l.notas,
        }}
      />

      <DeleteButton
        action={del}
        confirmText={`Apagar o lead "${l.titulo}"? Esta ação é irreversível.`}
        className="btn btn-ghost btn-sm"
        formStyle={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--red)" }}>
          <i className="ti ti-trash" /> Apagar lead
        </span>
      </DeleteButton>
    </Page>
  );
}
