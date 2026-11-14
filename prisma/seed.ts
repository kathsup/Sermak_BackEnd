import { PrismaClient } from '@prisma/client';
import { genSalt, hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL!.toLowerCase();
  const salt = await genSalt(10);
  const password = await hash(process.env.ADMIN_PASSWORD!, salt);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: 'Katherine',
      lastName: 'Carvallo',
      email,
      password,
      salt,
    },
  });

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({ data: { recipientEmails: [email] } });
  }
}

main().finally(() => prisma.$disconnect());
