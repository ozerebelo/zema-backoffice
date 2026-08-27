"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";

type DateField = "rec" | "entrega" | "recReal" | "entregaReal";

function pontualidade(entrega: Date | null, entregaReal: Date | null): string | null {
  if (!entrega || !entregaReal) return null;
  const dias = Math.round(
    (Date.UTC(entregaReal.getUTCFullYear(), entregaReal.getUTCMonth(), entregaReal.getUTCDate()) -
      Date.UTC(entrega.getUTCFullYear(), entrega.getUTCMonth(), entrega.getUTCDate())) /
      86_400_000
  );
  return dias <= 0 ? "no prazo" : `atraso ${dias}d`;
}

/** Define uma das datas do episódio. A data real é escolhida pelo utilizador
 *  (não assume "hoje"). Ao definir entrega real: marca entregue (fase 4),
 *  recalcula pontualidade e regista no histórico. */
export async function setEpisodeDate(
  episodeId: string,
  field: DateField,
  value: string | null
) {
  const ep = await prisma.episodeSchedule.findUnique({ where: { id: episodeId } });
  if (!ep) return;

  const date = parseDateOnly(value);
  const data: Record<string, unknown> = { [field]: date };

  // datas previstas/reais que afetam pontualidade
  const entrega = field === "entrega" ? date : ep.entrega;
  const entregaReal = field === "entregaReal" ? date : ep.entregaReal;

  if (field === "entregaReal") {
    data.pontualidade = pontualidade(entrega, entregaReal);
    if (date) {
      data.fase = 4; // entregue
      if (!ep.reviewStatus) data.reviewStatus = "aguarda_feedback"; // arranca o ciclo de revisão (v1)
    }
  } else if (field === "entrega") {
    data.pontualidade = pontualidade(entrega, entregaReal);
  }

  await prisma.episodeSchedule.update({ where: { id: episodeId }, data });

  // histórico só em eventos significativos
  if (field === "entregaReal" && date) {
    const p = pontualidade(entrega, entregaReal);
    await logHistory(
      ep.projetoId,
      `Ep.${ep.idx + 1} entregue`,
      p === "no prazo" ? "✓ No prazo" : `⚠ ${p}`
    );
  } else if (field === "recReal" && date) {
    await logHistory(ep.projetoId, `Ep.${ep.idx + 1} — material recebido`, value!);
  }

  revalidatePaths(ep.projetoId);
}

export async function setEpisodeFase(episodeId: string, fase: number) {
  const ep = await prisma.episodeSchedule.findUnique({ where: { id: episodeId } });
  if (!ep) return;
  const data: { fase: number; reviewStatus?: string | null } = { fase };
  if (fase === 4 && !ep.reviewStatus) data.reviewStatus = "aguarda_feedback"; // arranca revisão
  else if (fase < 4 && ep.reviewStatus) data.reviewStatus = null; // sai do ciclo
  await prisma.episodeSchedule.update({ where: { id: episodeId }, data });
  revalidatePaths(ep.projetoId);
}

/** Transições do ciclo de revisão de um episódio (após entrega). */
export async function setEpisodeReview(
  episodeId: string,
  action: "feedback" | "reentregar" | "aprovar" | "reabrir"
) {
  const ep = await prisma.episodeSchedule.findUnique({ where: { id: episodeId } });
  if (!ep) return;
  const n = ep.idx + 1;
  const data: Record<string, unknown> = {};

  if (action === "feedback") {
    data.reviewStatus = "em_revisao";
    await logHistory(ep.projetoId, `Ep.${n} — feedback recebido`, `v${ep.reviewRound}`);
  } else if (action === "reentregar") {
    data.reviewStatus = "aguarda_feedback";
    data.reviewRound = ep.reviewRound + 1;
    data.fase = 4;
    data.entregaReal = new Date();
    await logHistory(ep.projetoId, `Ep.${n} reentregue`, `v${ep.reviewRound + 1}`);
  } else if (action === "aprovar") {
    data.reviewStatus = "aprovado";
    await logHistory(ep.projetoId, `Ep.${n} aprovado`, "✓ Final");
  } else if (action === "reabrir") {
    data.reviewStatus = "em_revisao";
    await logHistory(ep.projetoId, `Ep.${n} reaberto`);
  }

  await prisma.episodeSchedule.update({ where: { id: episodeId }, data });
  revalidatePaths(ep.projetoId);
}

/** Horas extra pontuais num episódio. Não altera o valor/episódio (valEp):
 *  ajusta o total do projeto pelo delta face ao extra anterior — coerente com
 *  o facto de o `valor` ser recalculado só no formulário, não em add/remove. */
export async function setEpisodeExtra(
  episodeId: string,
  valorExtra: number,
  nota: string | null
) {
  const ep = await prisma.episodeSchedule.findUnique({ where: { id: episodeId } });
  if (!ep) return;

  const novo = Math.max(0, Math.round((Number.isFinite(valorExtra) ? valorExtra : 0) * 100) / 100);
  const anterior = Number(ep.extra);
  const delta = Math.round((novo - anterior) * 100) / 100;

  await prisma.episodeSchedule.update({
    where: { id: episodeId },
    data: { extra: novo, extraNota: nota?.trim() || null },
  });

  if (delta !== 0) {
    const proj = await prisma.projeto.findUnique({
      where: { id: ep.projetoId },
      select: { valor: true },
    });
    if (proj) {
      const valor = Math.round((Number(proj.valor) + delta) * 100) / 100;
      await prisma.projeto.update({ where: { id: ep.projetoId }, data: { valor } });
    }
    await logHistory(
      ep.projetoId,
      `Ep.${ep.idx + 1} — horas extra`,
      `${delta > 0 ? "+" : ""}€${delta}${nota?.trim() ? ` (${nota.trim()})` : ""}`
    );
  }

  revalidatePaths(ep.projetoId);
  revalidatePath("/financeiro");
}

async function logHistory(projetoId: string, action: string, detail?: string) {
  const now = new Date();
  const tsRaw =
    String(now.getDate()).padStart(2, "0") +
    "/" +
    String(now.getMonth() + 1).padStart(2, "0") +
    " " +
    String(now.getHours()).padStart(2, "0") +
    "h" +
    String(now.getMinutes()).padStart(2, "0");
  await prisma.projetoHistory.create({
    data: { projetoId, ts: now, tsRaw, action, detail },
  });
}

function revalidatePaths(projetoId: string) {
  revalidatePath(`/producao/${projetoId}`);
  revalidatePath("/producao");
  revalidatePath("/");
}
