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
  "Grading",
  "Visionamento",
  "Deliverables / DCP",
  "Entregue",
] as const;

export const PROD_PHASES_SHORT = [
  "Conform/Ingest",
  "Grading",
  "Visionamento",
  "Deliverables",
  "Entregue",
] as const;

export function faseLabel(fase: number): string {
  return PROD_PHASES[fase] ?? PROD_PHASES[0];
}

// ─── Ciclo de revisão (após entrega) ─────────────────────────────
export type ReviewStatus = "aguarda_feedback" | "em_revisao" | "aprovado";

export const REVIEW: Record<ReviewStatus, { label: string; color: string }> = {
  aguarda_feedback: { label: "Aguarda feedback", color: "#D97706" },
  em_revisao: { label: "Em revisão", color: "#7C3AED" },
  aprovado: { label: "Aprovado", color: "#059669" },
};

export function reviewLabel(status: string | null, round?: number): string | null {
  if (!status || !(status in REVIEW)) return null;
  const base = REVIEW[status as ReviewStatus].label;
  return round && round > 1 && status !== "aprovado" ? `${base} · v${round}` : base;
}

// ─── Financeiro (estado da proposta) ─────────────────────────────
export const FIN_STATES: { value: FinState; label: string; badge: string; color: string }[] = [
  { value: "em_producao", label: "Em produção", badge: "badge-blue", color: "#2563EB" },
  { value: "entregue", label: "Entregue", badge: "badge-amber", color: "#D97706" },
  { value: "faturado", label: "Faturado", badge: "badge-purple", color: "#7C3AED" },
  { value: "pago", label: "Pago", badge: "badge-green", color: "#059669" },
];

export const FIN_STATE_COLOR: Record<FinState, string> = Object.fromEntries(
  FIN_STATES.map((s) => [s.value, s.color])
) as Record<FinState, string>;

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
