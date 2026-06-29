-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('contacto_inicial', 'proposta_enviada', 'em_negociacao', 'aguarda_decisao');

-- CreateEnum
CREATE TYPE "FinState" AS ENUM ('em_producao', 'entregue', 'faturado', 'pago');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT,
    "empresa" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nif" TEXT,
    "email" TEXT,
    "tel" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacto" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "tel" TEXT,

    CONSTRAINT "contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente_id" UUID,
    "tipo" TEXT,
    "eps" INTEGER NOT NULL DEFAULT 0,
    "val_ep" DECIMAL(10,2),
    "camera" TEXT,
    "formato" TEXT,
    "duracao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "LeadStage" NOT NULL DEFAULT 'contacto_inicial',
    "notas" TEXT,
    "internacional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT,
    "titulo" TEXT NOT NULL,
    "cliente_id" UUID,
    "tipo" TEXT,
    "dp" TEXT,
    "camera" TEXT,
    "formato" TEXT,
    "duracao" TEXT,
    "eps" INTEGER NOT NULL DEFAULT 0,
    "recepcao" DATE,
    "prazo" DATE,
    "fase" INTEGER NOT NULL DEFAULT 0,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "internacional" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_schedule" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "idx" INTEGER NOT NULL,
    "rec" DATE,
    "entrega" DATE,
    "fase" INTEGER NOT NULL DEFAULT 0,
    "rec_real" DATE,
    "entrega_real" DATE,
    "pontualidade" TEXT,

    CONSTRAINT "episode_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "dur" TEXT,
    "notas" TEXT,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projeto_history" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "ts_raw" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "projeto_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposta" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "FinState" NOT NULL DEFAULT 'em_producao',
    "notas" TEXT,
    "internacional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibo" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "data" DATE NOT NULL,
    "notas" TEXT,
    "internacional" BOOLEAN NOT NULL DEFAULT false,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "taxa_irs" DECIMAL(4,3) NOT NULL DEFAULT 0.23,
    "taxa_iva" DECIMAL(4,3) DEFAULT 0.23,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recibo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iva_state" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "iva_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" UUID NOT NULL,
    "icon" TEXT,
    "type" TEXT,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_legacy_id_key" ON "cliente"("legacy_id");

-- CreateIndex
CREATE INDEX "contacto_cliente_id_idx" ON "contacto"("cliente_id");

-- CreateIndex
CREATE INDEX "lead_cliente_id_idx" ON "lead"("cliente_id");

-- CreateIndex
CREATE INDEX "lead_estado_idx" ON "lead"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "projeto_legacy_id_key" ON "projeto"("legacy_id");

-- CreateIndex
CREATE INDEX "projeto_cliente_id_idx" ON "projeto"("cliente_id");

-- CreateIndex
CREATE INDEX "projeto_fase_idx" ON "projeto"("fase");

-- CreateIndex
CREATE INDEX "episode_schedule_projeto_id_idx" ON "episode_schedule"("projeto_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_schedule_projeto_id_idx_key" ON "episode_schedule"("projeto_id", "idx");

-- CreateIndex
CREATE INDEX "sessao_projeto_id_idx" ON "sessao"("projeto_id");

-- CreateIndex
CREATE INDEX "projeto_history_projeto_id_idx" ON "projeto_history"("projeto_id");

-- CreateIndex
CREATE INDEX "proposta_projeto_id_idx" ON "proposta"("projeto_id");

-- CreateIndex
CREATE INDEX "recibo_projeto_id_idx" ON "recibo"("projeto_id");

-- CreateIndex
CREATE INDEX "recibo_data_idx" ON "recibo"("data");

-- CreateIndex
CREATE UNIQUE INDEX "iva_state_year_quarter_key" ON "iva_state"("year", "quarter");

-- CreateIndex
CREATE INDEX "activity_created_at_idx" ON "activity"("created_at");

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_schedule" ADD CONSTRAINT "episode_schedule_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_history" ADD CONSTRAINT "projeto_history_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposta" ADD CONSTRAINT "proposta_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recibo" ADD CONSTRAINT "recibo_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
