-- Data de recebimento (IRS é regime de caixa: conta o ano em que se recebe)
ALTER TABLE "recibo" ADD COLUMN "data_pagamento" DATE;

-- Recibos já marcados como recebidos: assume a data de emissão
UPDATE "recibo" SET "data_pagamento" = "data" WHERE "pago" = true;

-- Cada emitente (NIF) tem a sua própria série sequencial por ano
CREATE UNIQUE INDEX "recibo_ano_emitente_numero_key" ON "recibo"("ano", "emitente", "numero");
