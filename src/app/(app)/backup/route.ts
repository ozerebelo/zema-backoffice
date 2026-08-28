import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Backup completo em JSON — rede de segurança fora do Neon.
 * Exporta todas as tabelas de dados (o utilizador/password fica de fora).
 */
export async function GET() {
  const [clientes, contactos, leads, projetos, episodios, linhas, sessoes, historico, propostas, recibos, ivaStates, activity] =
    await Promise.all([
      prisma.cliente.findMany(),
      prisma.contacto.findMany(),
      prisma.lead.findMany(),
      prisma.projeto.findMany(),
      prisma.episodeSchedule.findMany(),
      prisma.orcamentoLinha.findMany(),
      prisma.sessao.findMany(),
      prisma.projetoHistory.findMany(),
      prisma.proposta.findMany(),
      prisma.recibo.findMany(),
      prisma.ivaState.findMany(),
      prisma.activity.findMany(),
    ]);

  const dump = {
    versao: 1,
    geradoEm: new Date().toISOString(),
    totais: {
      clientes: clientes.length,
      leads: leads.length,
      projetos: projetos.length,
      recibos: recibos.length,
    },
    dados: {
      clientes, contactos, leads, projetos, episodios, linhas,
      sessoes, historico, propostas, recibos, ivaStates, activity,
    },
  };

  const data = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zema-backup-${data}.json"`,
    },
  });
}
