// Constantes de domínio — fonte única de verdade para estados, fases e labels.
// Mantém paridade com o backoffice v4.35 (LEAD_STAGES, PROD_PHASES, FIN_STATES).
import type { LeadStage, FinState } from "@prisma/client";

// ─── Pipeline comercial (leads) ──────────────────────────────────
export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: "contacto_inicial", label: "Contacto inicial" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aguarda_decisao", label: "Aguarda decisão" },
];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.value, s.label])
) as Record<LeadStage, string>;

// ─── Produção (fase 0..4) ────────────────────────────────────────
export const PROD_PHASES = [
  "Conform / Ingest",
  "Sessão 1 — Primary",
  "Sessão 2 — Revisão",
  "Deliverables / DCP",
  "Entregue",
] as const;

export const PROD_PHASES_SHORT = [
  "Conform/Ingest",
  "Sessão 1",
  "Sessão 2",
  "Deliverables",
  "Entregue",
] as const;

export function faseLabel(fase: number): string {
  return PROD_PHASES[fase] ?? PROD_PHASES[0];
}

// ─── Financeiro (estado da proposta) ─────────────────────────────
export const FIN_STATES: { value: FinState; label: string; badge: string }[] = [
  { value: "em_producao", label: "Em produção", badge: "badge-blue" },
  { value: "entregue", label: "Entregue", badge: "badge-amber" },
  { value: "faturado", label: "Faturado", badge: "badge-purple" },
  { value: "pago", label: "Pago", badge: "badge-green" },
];

export const FIN_STATE_LABEL: Record<FinState, string> = Object.fromEntries(
  FIN_STATES.map((s) => [s.value, s.label])
) as Record<FinState, string>;

export const FIN_STATE_BADGE: Record<FinState, string> = Object.fromEntries(
  FIN_STATES.map((s) => [s.value, s.badge])
) as Record<FinState, string>;

// ─── Catálogos editáveis (tipos / formatos) ──────────────────────
export const TIPOS = [
  "Documentário",
  "Publicidade",
  "Série / Episódio",
  "Videoclipe",
  "Entretenimento",
  "Curta-Metragem",
  "Outro",
] as const;

export const FORMATOS = [
  "S-Log3",
  "LogC (ProRes)",
  "ARRIRAW",
  "Outro",
] as const;
