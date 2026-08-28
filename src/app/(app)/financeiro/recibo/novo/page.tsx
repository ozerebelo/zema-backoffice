import Link from "next/link";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { ReciboForm, type ProjetoOpt } from "@/components/ReciboForm";
import { createRecibo } from "../../actions";
import { EMITENTES } from "@/lib/emitente";

export const dynamic = "force-dynamic";

export default async function NovoReciboPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string }>;
}) {
  const sp = await searchParams;
  const todos = await prisma.projeto.findMany({
    include: { cliente: true, recibos: { select: { valor: true } } },
    orderBy: { titulo: "asc" },
  });
  const cents = (n: unknown) => Math.round(Number(n) * 100);

  // Só projetos por faturar (sem recibo ou parcialmente faturados) — o já
  // totalmente faturado sai da lista, exceto o pré-selecionado por link.
  const projetos: ProjetoOpt[] = todos
    .filter((p) => {
      if (p.id === sp.projeto) return true;
      const faturado = p.recibos.reduce((s, r) => s + cents(r.valor), 0);
      return faturado < cents(p.valor);
    })
    .map((p) => {
      const faturado = p.recibos.reduce((s, r) => s + Number(r.valor), 0);
      return {
        id: p.id,
        label: `${p.titulo}${p.cliente ? ` · ${p.cliente.nome}` : ""}`,
        cliente: p.cliente?.nome ?? null,
        temNif: !!p.cliente?.nif,
        temMorada: !!p.cliente?.morada,
        restante: Math.max(0, Math.round((Number(p.valor) - faturado) * 100) / 100),
      };
    });

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Page
      title="Emitir recibo"
      actions={
        <Link href="/financeiro?tab=recibos" className="btn btn-ghost btn-sm">
          <i className="ti ti-arrow-left" /> Voltar
        </Link>
      }
    >
      <ReciboForm
        action={createRecibo}
        projetos={projetos}
        emitentes={EMITENTES.map((e) => ({ id: e.id, label: `${e.nome} · ${e.nif}` }))}
        initial={{ projetoId: sp.projeto }}
        hoje={hoje}
      />
    </Page>
  );
}
