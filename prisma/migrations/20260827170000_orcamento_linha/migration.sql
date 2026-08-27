-- Linhas de orçamento (ex.: "Base SDR" + "Extra HDR") num lead ou projeto
CREATE TABLE "orcamento_linha" (
    "id" UUID NOT NULL,
    "lead_id" UUID,
    "projeto_id" UUID,
    "idx" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "val_ep" DECIMAL(10,2),
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "incluida" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "orcamento_linha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orcamento_linha_lead_id_idx" ON "orcamento_linha"("lead_id");
CREATE INDEX "orcamento_linha_projeto_id_idx" ON "orcamento_linha"("projeto_id");

ALTER TABLE "orcamento_linha" ADD CONSTRAINT "orcamento_linha_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orcamento_linha" ADD CONSTRAINT "orcamento_linha_projeto_id_fkey"
  FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
