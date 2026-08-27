"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import type { FinState } from "@prisma/client";

function revalidateFin() {
  revalidatePath("/financeiro");
  revalidatePath("/producao");
  revalidatePath("/");
}

/** Alinha o estado da proposta com os recibos:
 *  totalmente pago → "pago"; totalmente emitido → "faturado"; se os recibos
 *  deixarem de cobrir e a proposta estava em faturado/pago → "entregue".
 *  Não mexe em estados manuais mais baixos (em produção / entregue). */
async function syncPropostaEstado(projetoId: string) {
  const [projeto, recibos, propostas] = await Promise.all([
    prisma.projeto.findUnique({ where: { id: projetoId }, select: { valor: true } }),
    prisma.recibo.findMany({ where: { projetoId }, select: { valor: true, pago: true } }),
    prisma.proposta.findMany({ where: { projetoId }, select: { id: true, estado: true } }),
  ]);
  if (!projeto || propostas.length === 0) return;

  const cents = (n: unknown) => Math.round(Number(n) * 100);
  const valorC = cents(projeto.valor);
  const faturadoC = recibos.reduce((s, r) => s + cents(r.valor), 0);
  const pagoC = recibos.filter((r) => r.pago).reduce((s, r) => s + cents(r.valor), 0);

  let target: FinState | null = null;
  if (valorC > 0 && pagoC >= valorC) target = "pago";
  else if (valorC > 0 && faturadoC >= valorC) target = "faturado";

  for (const pr of propostas) {
    if (target) {
      if (pr.estado !== target) {
        await prisma.proposta.update({ where: { id: pr.id }, data: { estado: target } });
      }
    } else if (pr.estado === "faturado" || pr.estado === "pago") {
      // recibos já não cobrem o valor → sai de faturado/pago
      await prisma.proposta.update({ where: { id: pr.id }, data: { estado: "entregue" } });
    }
  }
}

export async function toggleReciboPago(id: string) {
  const r = await prisma.recibo.findUnique({ where: { id } });
  if (!r) return;
  const pago = !r.pago;
  await prisma.recibo.update({
    where: { id },
    // ao marcar recebido regista a data de hoje (editável no formulário)
    data: { pago, dataPagamento: pago ? (r.dataPagamento ?? new Date()) : null },
  });
  await syncPropostaEstado(r.projetoId);
  revalidateFin();
}

export async function setIvaQuarter(year: number, quarter: number, state: string) {
  await prisma.ivaState.upsert({
    where: { year_quarter: { year, quarter } },
    update: { state },
    create: { year, quarter, state },
  });
  revalidateFin();
}

export async function updatePropostaEstado(id: string, estado: FinState) {
  await prisma.proposta.update({ where: { id }, data: { estado } });
  revalidateFin();
}

export async function deleteRecibo(id: string) {
  await requireUser();
  const r = await prisma.recibo.findUnique({ where: { id }, select: { projetoId: true } });
  await prisma.recibo.delete({ where: { id } });
  if (r) await syncPropostaEstado(r.projetoId);
  revalidateFin();
}

export async function createRecibo(fd: FormData) {
  const projetoId = String(fd.get("projetoId") ?? "");
  const data = parseDateOnly(fd.get("data"));
  if (!projetoId || !data) return;

  const internacional = fd.get("internacional") === "on";
  // Série sequencial por EMITENTE e ano ({ano}/{numero}): cada NIF é um sujeito
  // passivo distinto, com a sua própria numeração. Imutável após criado.
  const ano = data.getUTCFullYear();
  const emitente = String(fd.get("emitente") ?? "").trim() || null;
  const pago = fd.get("pago") === "on";
  await prisma.$transaction(async (tx) => {
    const last = await tx.recibo.aggregate({ where: { ano, emitente }, _max: { numero: true } });
    await tx.recibo.create({
      data: {
        projetoId,
        ano,
        numero: (last._max.numero ?? 0) + 1,
        emitente,
        valor: Number(fd.get("valor")) || 0,
        data,
        notas: (String(fd.get("notas") ?? "").trim() || null) as string | null,
        internacional,
        pago,
        // data de recebimento: a indicada, ou a de emissão se já vem recebido
        dataPagamento: pago ? (parseDateOnly(fd.get("dataPagamento")) ?? data) : null,
        semRecibo: fd.get("semRecibo") === "on",
        taxaIRS: internacional ? 0 : Number(fd.get("taxaIRS") ?? 0.23),
        taxaIVA: internacional ? 0 : Number(fd.get("taxaIVA") ?? 0.23),
      },
    });
  });

  const proj = await prisma.projeto.findUnique({ where: { id: projetoId } });
  await prisma.activity.create({
    data: {
      icon: "ti-receipt",
      type: "green",
      text: `Recibo de €${Number(fd.get("valor")) || 0} — "${proj?.titulo ?? "—"}"`,
    },
  });

  await syncPropostaEstado(projetoId);
  revalidateFin();
  redirect("/financeiro?tab=recibos");
}

export async function updateRecibo(id: string, fd: FormData) {
  await requireUser();
  const atual = await prisma.recibo.findUnique({ where: { id }, select: { projetoId: true } });
  if (!atual) return;

  const projetoId = String(fd.get("projetoId") ?? "") || atual.projetoId;
  const data = parseDateOnly(fd.get("data"));
  if (!data) return;

  const internacional = fd.get("internacional") === "on";
  await prisma.recibo.update({
    where: { id },
    data: {
      projetoId,
      emitente: String(fd.get("emitente") ?? "").trim() || null,
      valor: Number(fd.get("valor")) || 0,
      data,
      notas: (String(fd.get("notas") ?? "").trim() || null) as string | null,
      internacional,
      pago: fd.get("pago") === "on",
      dataPagamento:
        fd.get("pago") === "on" ? (parseDateOnly(fd.get("dataPagamento")) ?? data) : null,
      semRecibo: fd.get("semRecibo") === "on",
      taxaIRS: internacional ? 0 : Number(fd.get("taxaIRS") ?? 0.23),
      taxaIVA: internacional ? 0 : Number(fd.get("taxaIVA") ?? 0.23),
    },
  });

  // Se o recibo mudou de projeto, ambos precisam de re-sincronizar o estado.
  await syncPropostaEstado(projetoId);
  if (atual.projetoId !== projetoId) await syncPropostaEstado(atual.projetoId);
  revalidateFin();
  redirect("/financeiro?tab=recibos");
}
