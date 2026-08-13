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

/** Arquiva (proposta → "pago") quando o total de recibos pagos cobre o valor
 *  do projeto; reverte para "faturado" se deixar de cobrir. */
async function syncPropostaPago(projetoId: string) {
  const [projeto, recibos] = await Promise.all([
    prisma.projeto.findUnique({ where: { id: projetoId }, select: { valor: true } }),
    prisma.recibo.findMany({ where: { projetoId }, select: { valor: true, pago: true } }),
  ]);
  if (!projeto) return;
  const valorCents = Math.round(Number(projeto.valor) * 100);
  const pagoCents = recibos
    .filter((x) => x.pago)
    .reduce((s, x) => s + Math.round(Number(x.valor) * 100), 0);
  const totalmentePago = valorCents > 0 && pagoCents >= valorCents;

  if (totalmentePago) {
    await prisma.proposta.updateMany({
      where: { projetoId, NOT: { estado: "pago" } },
      data: { estado: "pago" },
    });
  } else {
    await prisma.proposta.updateMany({
      where: { projetoId, estado: "pago" },
      data: { estado: "faturado" },
    });
  }
}

export async function toggleReciboPago(id: string) {
  const r = await prisma.recibo.findUnique({ where: { id } });
  if (!r) return;
  await prisma.recibo.update({ where: { id }, data: { pago: !r.pago } });
  await syncPropostaPago(r.projetoId);
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
  if (r) await syncPropostaPago(r.projetoId);
  revalidateFin();
}

export async function createRecibo(fd: FormData) {
  const projetoId = String(fd.get("projetoId") ?? "");
  const data = parseDateOnly(fd.get("data"));
  if (!projetoId || !data) return;

  const internacional = fd.get("internacional") === "on";
  await prisma.recibo.create({
    data: {
      projetoId,
      valor: Number(fd.get("valor")) || 0,
      data,
      notas: (String(fd.get("notas") ?? "").trim() || null) as string | null,
      internacional,
      pago: fd.get("pago") === "on",
      taxaIRS: internacional ? 0 : Number(fd.get("taxaIRS") ?? 0.23),
      taxaIVA: internacional ? 0 : Number(fd.get("taxaIVA") ?? 0.23),
    },
  });

  const proj = await prisma.projeto.findUnique({ where: { id: projetoId } });
  await prisma.activity.create({
    data: {
      icon: "ti-receipt",
      type: "green",
      text: `Recibo de €${Number(fd.get("valor")) || 0} — "${proj?.titulo ?? "—"}"`,
    },
  });

  await syncPropostaPago(projetoId);
  revalidateFin();
  redirect("/financeiro?tab=recibos");
}
