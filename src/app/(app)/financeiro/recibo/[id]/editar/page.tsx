import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ReciboForm, type ProjetoOpt } from "@/components/ReciboForm";
import { updateRecibo } from "../../../actions";
import { EMITENTES } from "@/lib/emitente";

export const dynamic = "force-dynamic";

export default async function EditarReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recibo, todos] = await Promise.all([
    prisma.recibo.findUnique({ where: { id } }),
    prisma.projeto.findMany({
      include: { cliente: true, recibos: { select: { id: true, valor: true } } },
      orderBy: { titulo: "asc" },
    }),
  ]);
  if (!recibo) notFound();

  const cents = (n: unknown) => Math.round(Number(n) * 100);

  // Projetos por faturar + o do próprio recibo (sempre incluído). O restante do
  // projeto deste recibo exclui o próprio valor — estamos a editá-lo.
  const projetos: ProjetoOpt[] = todos
    .filter((p) => {
      if (p.id === recibo.projetoId) return true;
      const faturado = p.recibos.reduce((s, r) => s + cents(r.valor), 0);
      return faturado < cents(p.valor);
    })
    .map((p) => {
      const faturado = p.recibos
        .filter((r) => r.id !== recibo.id)
        .reduce((s, r) => s + Number(r.valor), 0);
      return {
        id: p.id,
        label: `${p.titulo}${p.cliente ? ` · ${p.cliente.nome}` : ""}`,
        cliente: p.cliente?.nome ?? null,
        temNif: !!p.cliente?.nif,
        temMorada: !!p.cliente?.morada,
        restante: Math.max(0, Math.round((Number(p.valor) - faturado) * 100) / 100),
      };
    });

  return (
    <Page
      title="Editar recibo"
      actions={
        <Link href="/financeiro?tab=recibos" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ReciboForm
        action={updateRecibo.bind(null, id)}
        projetos={projetos}
        emitentes={EMITENTES.map((e) => ({ id: e.id, label: `${e.nome} · ${e.nif}` }))}
        edit
        submitLabel="Guardar alterações"
        hoje={new Date().toISOString().slice(0, 10)}
        initial={{
          projetoId: recibo.projetoId,
          emitente: recibo.emitente ?? undefined,
          valor: Number(recibo.valor),
          data: recibo.data.toISOString().slice(0, 10),
          taxaIRS: Number(recibo.taxaIRS),
          taxaIVA: recibo.taxaIVA == null ? undefined : Number(recibo.taxaIVA),
          notas: recibo.notas ?? "",
          internacional: recibo.internacional,
          pago: recibo.pago,
          dataPagamento: recibo.dataPagamento
            ? recibo.dataPagamento.toISOString().slice(0, 10)
            : undefined,
          semRecibo: recibo.semRecibo,
        }}
      />
    </Page>
  );
}
