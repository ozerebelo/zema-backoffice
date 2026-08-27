-- Numeração sequencial de recibos: {ano}/{numero}
ALTER TABLE "recibo" ADD COLUMN "ano" INTEGER;
ALTER TABLE "recibo" ADD COLUMN "numero" INTEGER;

-- Backfill dos recibos existentes: sequência por ano, ordenada por data e criação.
WITH ordered AS (
  SELECT id,
         EXTRACT(YEAR FROM data)::int AS y,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM data)
           ORDER BY data ASC, created_at ASC
         ) AS rn
  FROM "recibo"
)
UPDATE "recibo" r
   SET "ano" = o.y, "numero" = o.rn
  FROM ordered o
 WHERE r.id = o.id;
