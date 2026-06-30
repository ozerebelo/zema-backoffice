-- AlterTable
ALTER TABLE "episode_schedule" ADD COLUMN     "review_round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "review_status" TEXT;

-- AlterTable
ALTER TABLE "projeto" ADD COLUMN     "review_round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "review_status" TEXT;
