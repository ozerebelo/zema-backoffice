import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Page } from "@/components/Page";
import { EpisodeCard } from "@/components/EpisodeCard";
import { ProjetoFase } from "@/components/ProjetoFase";
import { addEpisode } from "../projeto-actions";
import { fmtMoney, fmtShort, toDateInput } from "@/lib/dates";
import styles from "./detalhe.module.css";

export const dynamic = "force-dynamic";

export default async function ProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.projeto.findUnique({
    where: { id },
    include: {
      cliente: true,
      episodios: { orderBy: { idx: "asc" } },
      sessoes: { orderBy: { data: "desc" } },
      history: { orderBy: { ts: "desc" }, take: 12 },
      recibos: { orderBy: { data: "desc" } },
      propostas: true,
    },
  });
  if (!p) notFound();

  const epCounts = [0, 0, 0, 0, 0];
  p.episodios.forEach((e) => (epCounts[Math.min(e.fase, 4)] += 1));
  const entregues = p.episodios.filter((e) => e.entregaReal).length;

  const facts: { k: string; v: string }[] = [
    { k: "Cliente", v: p.cliente?.nome ?? "—" },
    { k: "Tipo", v: p.tipo ?? "—" },
    { k: "Formato", v: p.formato ?? "—" },
    { k: "Câmara", v: p.camera || "—" },
    { k: "Duração", v: p.duracao || "—" },
    { k: "DP", v: p.dp || "—" },
    { k: "Valor", v: fmtMoney(Number(p.valor)) },
    { k: "Episódios", v: p.eps ? String(p.eps) : "—" },
  ];

  return (
    <Page
      title={p.titulo}
      sub={p.cliente?.nome ?? undefined}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/producao/${p.id}/editar`} className="btn btn-ghost btn-sm">
            <i className="ti ti-edit" /> Editar
          </Link>
          <Link href="/producao" className="btn btn-ghost btn-sm">
            <i className="ti ti-arrow-left" /> Voltar
          </Link>
        </div>
      }
    >
      {/* Factos */}
      <div className={styles.facts}>
        {facts.map((f) => (
          <div className={styles.fact} key={f.k}>
            <span className={styles.factK}>{f.k}</span>
            <span className={styles.factV}>{f.v}</span>
          </div>
        ))}
      </div>

      <div className={styles.layout}>
        <div>
          {/* Episódios */}
          {p.episodios.length > 0 && (
            <>
              <div className={styles.sectionHead}>
                <span className={styles.section}>Episódios</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={styles.epSummary}>
                    {entregues}/{p.episodios.length} entregues
                  </span>
                  <form action={addEpisode.bind(null, p.id)}>
                    <button type="submit" className="btn btn-ghost btn-sm">
                      <i className="ti ti-plus" /> Episódio
                    </button>
                  </form>
                </div>
              </div>
              <div className={styles.epGrid}>
                {p.episodios.map((e) => (
                  <EpisodeCard
                    key={e.id}
                    ep={{
                      id: e.id,
                      idx: e.idx,
                      rec: toDateInput(e.rec),
                      entrega: toDateInput(e.entrega),
                      recReal: toDateInput(e.recReal),
                      entregaReal: toDateInput(e.entregaReal),
                      fase: e.fase,
                      pontualidade: e.pontualidade,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Projeto sem episódios: fase global */}
          {p.episodios.length === 0 && (
            <>
              <div className={styles.section} style={{ marginBottom: 10 }}>Fase</div>
              <div style={{ marginBottom: 14 }}>
                <ProjetoFase
                  projetoId={p.id}
                  fase={p.fase}
                  entregaReal={toDateInput(p.entregaReal)}
                  prazoLabel={p.prazo ? fmtShort(p.prazo) : null}
                />
              </div>
              <form action={addEpisode.bind(null, p.id)} style={{ marginBottom: 22 }}>
                <button type="submit" className="btn btn-ghost btn-sm">
                  <i className="ti ti-plus" /> Adicionar episódio
                </button>
              </form>
            </>
          )}

          {/* Sessões */}
          {p.sessoes.length > 0 && (
            <>
              <div className={styles.section} style={{ marginTop: 22 }}>Sessões</div>
              <div className="card">
                {p.sessoes.map((s) => (
                  <div className={styles.row} key={s.id}>
                    <span>{fmtShort(s.data)}</span>
                    <span style={{ color: "var(--text-muted)" }}>{s.dur || ""}</span>
                    <span style={{ flex: 1, color: "var(--text-secondary)" }}>{s.notas || ""}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lateral: financeiro + histórico */}
        <aside className={styles.side}>
          <div className="card">
            <div className={styles.sideHead}>Recibos</div>
            {p.recibos.length === 0 && <div className={styles.empty}>Sem recibos</div>}
            {p.recibos.map((r) => (
              <div className={styles.row} key={r.id}>
                <span>{fmtShort(r.data)}</span>
                <span style={{ flex: 1 }}>{fmtMoney(Number(r.valor))}</span>
                <span className={`badge ${r.pago ? "badge-green" : "badge-amber"}`}>
                  {r.pago ? "Pago" : "Por receber"}
                </span>
              </div>
            ))}
          </div>

          {p.history.length > 0 && (
            <div className="card">
              <div className={styles.sideHead}>Histórico</div>
              {p.history.map((h) => (
                <div className={styles.histRow} key={h.id}>
                  <span className={styles.histTs}>{h.tsRaw}</span>
                  <div>
                    <div className={styles.histAction}>{h.action}</div>
                    {h.detail && <div className={styles.histDetail}>{h.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
}
