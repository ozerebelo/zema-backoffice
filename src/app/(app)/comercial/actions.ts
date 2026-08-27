"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { LeadStage } from "@prisma/client";

function num(v: FormDataEntryValue | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: FormDataEntryValue | null): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function readLead(fd: FormData) {
  const eps = Math.max(0, Math.trunc(num(fd.get("eps"))));
  const valueMode = String(fd.get("valueMode") ?? "total");
  let valor: number;
  let valEp: number | null = null;
  if (valueMode === "perEp") {
    valEp = num(fd.get("valEp"));
    valor = Math.round(valEp * eps * 100) / 100;
  } else {
    valor = num(fd.get("valor"));
  }
  return {
    titulo: str(fd.get("titulo")) ?? "—",
    clienteId: str(fd.get("clienteId")),
    tipo: str(fd.get("tipo")),
    formato: str(fd.get("formato")),
    camera: str(fd.get("camera")),
    duracao: str(fd.get("duracao")),
    eps,
    valEp,
    valor,
    estado: (str(fd.get("estado")) ?? "contacto_inicial") as LeadStage,
    internacional: fd.get("internacional") === "on",
    notas: str(fd.get("notas")),
  };
}

export async function createLead(fd: FormData) {
  const f = readLead(fd);
  if (!f.titulo) return;
  const { clienteId, ...rest } = f;
  await prisma.lead.create({
    data: { ...rest, cliente: clienteId ? { connect: { id: clienteId } } : undefined },
  });
  revalidatePath("/comercial");
  redirect("/comercial");
}

export async function updateLead(id: string, fd: FormData) {
  const f = readLead(fd);
  await prisma.lead.update({ where: { id }, data: f });
  revalidatePath("/comercial");
  redirect("/comercial");
}

export async function deleteLead(id: string) {
  await requireUser();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/comercial");
  redirect("/comercial");
}

export async function setLeadEstado(id: string, estado: LeadStage) {
  await prisma.lead.update({ where: { id }, data: { estado } });
  revalidatePath("/comercial");
  revalidatePath("/");
}

/** Marca um lead como perdido (mantém-no para métricas de conversão). */
export async function marcarLeadPerdido(id: string) {
  await prisma.lead.update({ where: { id }, data: { estado: "perdido" } });
  await prisma.activity.create({
    data: { icon: "ti-target-off", type: "grey", text: `Lead perdido` },
  });
  revalidatePath("/comercial");
  revalidatePath("/");
  redirect("/comercial");
}

/** Reabre um lead terminal (ganho/perdido) de volta ao pipeline. */
export async function reabrirLead(id: string) {
  await prisma.lead.update({ where: { id }, data: { estado: "aguarda_decisao" } });
  revalidatePath("/comercial");
  revalidatePath("/");
  redirect(`/comercial/${id}/editar`);
}

/** Promove um lead a projeto em produção (cria projeto + proposta) e marca o
 *  lead como "ganho" — mantém-no como histórico para a taxa de conversão. */
export async function promoteLead(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return;
  if (lead.estado === "ganho") return redirect("/comercial"); // já promovido
  const projeto = await prisma.projeto.create({
    data: {
      titulo: lead.titulo,
      clienteId: lead.clienteId,
      tipo: lead.tipo,
      formato: lead.formato,
      camera: lead.camera,
      duracao: lead.duracao,
      eps: lead.eps,
      valEp: lead.valEp,
      valor: lead.valor,
      internacional: lead.internacional,
      notas: lead.notas,
      fase: 0,
      episodios: {
        create: Array.from({ length: lead.eps }, (_, idx) => ({ idx, fase: 0 })),
      },
      propostas: {
        create: { valor: lead.valor, estado: "em_producao", internacional: lead.internacional },
      },
    },
  });
  // Mantém o lead como "ganho" (histórico + taxa de conversão), não apaga.
  await prisma.lead.update({ where: { id }, data: { estado: "ganho" } });
  await prisma.activity.create({
    data: { icon: "ti-movie", type: "navy", text: `"${lead.titulo}" promovido a produção` },
  });
  revalidatePath("/comercial");
  revalidatePath("/producao");
  revalidatePath("/");
  redirect(`/producao/${projeto.id}`);
}
