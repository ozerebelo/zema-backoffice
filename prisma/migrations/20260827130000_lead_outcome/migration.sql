-- Novos estados terminais de lead (ganho / perdido)
ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'ganho';
ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'perdido';
