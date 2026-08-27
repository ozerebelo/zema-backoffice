-- Emitente escolhido por recibo (chave em src/lib/emitente.ts). Null = default.
ALTER TABLE "recibo" ADD COLUMN "emitente" TEXT;
