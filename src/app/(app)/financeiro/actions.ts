"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import type { FinState } from "@prisma/client";

function revalidateFin() {
  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function toggleReciboPago(id: string) {
  const r = await prisma.recibo.findUnique({ where: { id } });
  if (!r) return;
  await prisma.recibo.update({ where: { id }, data: { pago: !r.pago } });
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
  await prisma.recibo.delete({ where: { id } });
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

  revalidateFin();
  redirect("/financeiro?tab=recibos");
}
