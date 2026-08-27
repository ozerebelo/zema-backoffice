import { prisma } from "@/lib/db";
import { reciboImpostos, reciboNumero } from "@/lib/finance";
import { getEmitente } from "@/lib/emitente";

export const dynamic = "force-dynamic";

// Escapa um campo para CSV (separador ";", aspas quando necessário).
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
// Número com vírgula decimal (formato PT para o Excel).
const money = (n: number) => n.toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ano = Number(url.searchParams.get("ano")) || new Date().getUTCFullYear();
  const emitenteId = url.searchParams.get("emitente");

  const recibos = await prisma.recibo.findMany({
    include: { projeto: { include: { cliente: true } } },
    orderBy: [{ data: "asc" }, { numero: "asc" }],
  });
  // Um CSV por emitente (cada NIF declara separadamente). Recibos antigos sem
  // emitente resolvem para o default, por isso nenhum fica de fora.
  const rows = recibos.filter(
    (r) =>
      r.data.getUTCFullYear() === ano &&
      (!emitenteId || getEmitente(r.emitente).id === emitenteId)
  );

  const header = [
    "Nº", "Data", "Emitente", "NIF emitente", "Projeto", "Cliente", "NIF cliente",
    "Base", "IVA", "IRS", "Líquido", "C/ IVA", "Internacional",
  ];
  const lines = [header.join(";")];
  for (const r of rows) {
    const t = reciboImpostos(r);
    const em = getEmitente(r.emitente);
    lines.push(
      [
        reciboNumero(r),
        r.data.toISOString().slice(0, 10),
        em.nome,
        em.nif,
        r.projeto?.titulo ?? "—",
        r.projeto?.cliente?.nome ?? "—",
        r.projeto?.cliente?.nif ?? "",
        money(Number(r.valor)),
        money(t.iva),
        money(t.irs),
        money(t.liquido),
        money(t.bruto),
        r.internacional ? "sim" : "não",
      ]
        .map(cell)
        .join(";")
    );
  }

  // BOM (﻿) para o Excel reconhecer UTF-8; CRLF entre linhas.
  const csv = "﻿" + lines.join("\r\n");
  const sufixo = emitenteId ? `-${getEmitente(emitenteId).nif}` : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recibos-${ano}${sufixo}.csv"`,
    },
  });
}
