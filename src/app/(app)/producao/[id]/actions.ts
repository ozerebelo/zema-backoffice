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
    if (date) data.fase = 4; // entregue
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
  await prisma.episodeSchedule.update({ where: { id: episodeId }, data: { fase } });
  revalidatePaths(ep.projetoId);
}

async function logHistory(projetoId: string, action: string, detail: string) {
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
