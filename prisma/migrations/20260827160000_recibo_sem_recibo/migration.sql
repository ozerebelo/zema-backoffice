-- Pagamento registado sem documento fiscal (excluído do CSV para contabilidade)
ALTER TABLE "recibo" ADD COLUMN "sem_recibo" BOOLEAN NOT NULL DEFAULT false;
