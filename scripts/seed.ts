// Seed do utilizador único. Idempotente (upsert por email).
// Lê ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME do ambiente.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Zema";

  if (!email || !password) {
    throw new Error(
      "Define ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de correr o seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: name },
    create: { email, passwordHash, displayName: name },
  });
  console.log(`✓ Utilizador pronto: ${user.email} (${user.displayName})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
