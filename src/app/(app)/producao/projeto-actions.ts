"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";

const COLORS = [
  "#2563EB", "#DC4A36", "#059669", "#D97706", "#7C3AED",
  "#0891B2", "#BE185D", "#65A30D", "#B45309", "#0F766E",
];

function num(v: FormDataEntryValue | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: FormDataEntryValue | null): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function readFields(fd: FormData) {
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
    dp: str(fd.get("dp")),
    duracao: str(fd.get("duracao")),
    eps,
    valEp,
    valor,
    fase: Math.min(4, Math.max(0, Math.trunc(num(fd.get("fase"))))),
    recepcao: parseDateOnly(fd.get("recepcao")),
    prazo: parseDateOnly(fd.get("prazo")),
    internacional: fd.get("internacional") === "on",
    notas: str(fd.get("notas")),
    color: str(fd.get("color")),
  };
}

export async function createProjeto(fd: FormData) {
  const f = readFields(fd);
  if (!f.titulo) return;

  const { clienteId, ...rest } = f;
  const projeto = await prisma.projeto.create({
    data: {
      ...rest,
      cliente: clienteId ? { connect: { id: clienteId } } : undefined,
      color: f.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
      episodios: {
        create: Array.from({ length: f.eps }, (_, idx) => ({ idx, fase: 0 })),
      },
      propostas: {
        create: { valor: f.valor, estado: "em_producao", internacional: f.internacional },
      },
    },
  });

  await prisma.activity.create({
    data: { icon: "ti-movie", type: "navy", text: `"${f.titulo}" em produção` },
  });

  revalidatePath("/producao");
  revalidatePath("/");
  redirect(`/producao/${projeto.id}`);
}

export async function updateProjeto(id: string, fd: FormData) {
  const f = readFields(fd);
  const current = await prisma.projeto.findUnique({
    where: { id },
    include: { episodios: { orderBy: { idx: "asc" } } },
  });
  if (!current) return;

  await prisma.projeto.update({
    where: { id },
    data: {
      titulo: f.titulo,
      clienteId: f.clienteId,
      tipo: f.tipo,
      formato: f.formato,
      camera: f.camera,
      dp: f.dp,
      duracao: f.duracao,
      eps: f.eps,
      valEp: f.valEp,
      valor: f.valor,
      fase: f.fase,
      recepcao: f.recepcao,
      prazo: f.prazo,
      internacional: f.internacional,
      notas: f.notas,
      ...(f.color ? { color: f.color } : {}),
    },
  });

  // A proposta espelha os termos financeiros do projeto — manter em sincronia.
  await prisma.proposta.updateMany({
    where: { projetoId: id },
    data: { internacional: f.internacional, valor: f.valor },
  });

  // Sincronizar nº de episódios (acrescenta no fim / remove os últimos)
  const have = current.episodios.length;
  if (f.eps > have) {
    await prisma.episodeSchedule.createMany({
      data: Array.from({ length: f.eps - have }, (_, k) => ({
        projetoId: id,
        idx: have + k,
        fase: 0,
      })),
    });
  } else if (f.eps < have) {
    const toRemove = current.episodios.slice(f.eps).map((e) => e.id);
    await prisma.episodeSchedule.deleteMany({ where: { id: { in: toRemove } } });
  }

  revalidatePath(`/producao/${id}`);
  revalidatePath("/producao");
  revalidatePath("/financeiro");
  revalidatePath("/");
  redirect(`/producao/${id}`);
}

export async function deleteProjeto(id: string) {
  await requireUser();
  const p = await prisma.projeto.findUnique({ where: { id } });
  await prisma.projeto.delete({ where: { id } });
  if (p) {
    await prisma.activity.create({
      data: { icon: "ti-trash", type: "navy", text: `"${p.titulo}" removido` },
    });
  }
  revalidatePath("/producao");
  revalidatePath("/");
  redirect("/producao");
}

function logProjHistory(projetoId: string, action: string, detail?: string) {
  const now = new Date();
  const tsRaw =
    String(now.getDate()).padStart(2, "0") +
    "/" +
    String(now.getMonth() + 1).padStart(2, "0") +
    " " +
    String(now.getHours()).padStart(2, "0") +
    "h" +
    String(now.getMinutes()).padStart(2, "0");
  return prisma.projetoHistory.create({
    data: { projetoId, ts: now, tsRaw, action, detail: detail ?? null },
  });
}

/** Define a fase do projeto (sem episódios). Marcar "Entregue" (fase 4) regista
 *  a data real de entrega (hoje, se ainda não definida) e o histórico; sair de
 *  entregue limpa a data. */
export async function quickSetProjetoFase(projetoId: string, fase: number) {
  const p = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!p) return;

  const data: { fase: number; entregaReal?: Date | null; reviewStatus?: string | null } = { fase };
  if (fase === 4) {
    if (!p.entregaReal) data.entregaReal = new Date();
    if (!p.reviewStatus) data.reviewStatus = "aguarda_feedback"; // arranca o ciclo de revisão
    if (p.fase !== 4) await logProjHistory(projetoId, "Projeto entregue");
  } else if (p.fase === 4) {
    data.entregaReal = null; // já não está entregue → solta a data
    data.reviewStatus = null; // e sai do ciclo de revisão
  }

  await prisma.projeto.update({ where: { id: projetoId }, data });
  revalidatePath("/producao");
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/");
}

/** Define a data real de entrega do projeto. Com data → marca entregue (fase 4)
 *  e regista histórico; a limpar → reverte para Deliverables (fase 3). */
export async function setProjetoEntregaReal(projetoId: string, value: string | null) {
  const p = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!p) return;

  const date = parseDateOnly(value);
  await prisma.projeto.update({
    where: { id: projetoId },
    data: {
      entregaReal: date,
      fase: date ? 4 : p.fase === 4 ? 3 : p.fase,
      reviewStatus: date ? (p.reviewStatus ?? "aguarda_feedback") : null,
    },
  });
  if (date && p.fase !== 4) {
    await logProjHistory(projetoId, "Projeto entregue", value!);
  }

  revalidatePath("/producao");
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/");
}

/** Datas planeadas (receção/prazo) de um projeto sem episódios. */
export async function setProjetoData(
  projetoId: string,
  field: "recepcao" | "prazo",
  value: string | null
) {
  await prisma.projeto.update({
    where: { id: projetoId },
    data: { [field]: parseDateOnly(value) },
  });
  revalidatePath("/producao");
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/");
}

/** Receção real do material (projetos sem episódios). Ativa o CF. */
export async function setProjetoRecepcaoReal(projetoId: string, value: string | null) {
  const date = parseDateOnly(value);
  await prisma.projeto.update({ where: { id: projetoId }, data: { recepcaoReal: date } });
  if (date) await logProjHistory(projetoId, "Material recebido", value!);
  revalidatePath("/producao");
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/");
}

/** Transições do ciclo de revisão de um projeto sem episódios. */
export async function setProjetoReview(
  projetoId: string,
  action: "feedback" | "reentregar" | "aprovar" | "reabrir"
) {
  const p = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!p) return;
  const data: Record<string, unknown> = {};

  if (action === "feedback") {
    data.reviewStatus = "em_revisao";
    await logProjHistory(projetoId, "Feedback recebido", `v${p.reviewRound}`);
  } else if (action === "reentregar") {
    data.reviewStatus = "aguarda_feedback";
    data.reviewRound = p.reviewRound + 1;
    data.fase = 4;
    data.entregaReal = new Date();
    await logProjHistory(projetoId, "Projeto reentregue", `v${p.reviewRound + 1}`);
  } else if (action === "aprovar") {
    data.reviewStatus = "aprovado";
    await logProjHistory(projetoId, "Projeto aprovado", "✓ Final");
  } else if (action === "reabrir") {
    data.reviewStatus = "em_revisao";
    await logProjHistory(projetoId, "Projeto reaberto");
  }

  await prisma.projeto.update({ where: { id: projetoId }, data });
  revalidatePath("/producao");
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/");
}

export async function addEpisode(projetoId: string) {
  const count = await prisma.episodeSchedule.count({ where: { projetoId } });
  await prisma.episodeSchedule.create({
    data: { projetoId, idx: count, fase: 0 },
  });
  await prisma.projeto.update({
    where: { id: projetoId },
    data: { eps: count + 1 },
  });
  revalidatePath(`/producao/${projetoId}`);
}

export async function removeEpisode(episodeId: string) {
  await requireUser();
  const ep = await prisma.episodeSchedule.findUnique({ where: { id: episodeId } });
  if (!ep) return;
  await prisma.episodeSchedule.delete({ where: { id: episodeId } });
  // reindexar os restantes para manter idx contíguo
  const rest = await prisma.episodeSchedule.findMany({
    where: { projetoId: ep.projetoId },
    orderBy: { idx: "asc" },
  });
  await prisma.$transaction([
    ...rest.map((e, i) =>
      prisma.episodeSchedule.update({ where: { id: e.id }, data: { idx: i } })
    ),
    prisma.projeto.update({ where: { id: ep.projetoId }, data: { eps: rest.length } }),
  ]);
  revalidatePath(`/producao/${ep.projetoId}`);
}
