import { PrismaClient } from "@prisma/client";
import { PARTICIPANTS, GROUPS, RECORDS, TAGS } from "./mock.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (prisma) => {
    await prisma.record.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.group.deleteMany();
    await prisma.tag.deleteMany();

    await prisma.tag.createMany({
      data: TAGS,
      skipDuplicates: true,
    });

    for (const group of GROUPS) {
      const tags = group.tags;
      delete group.tags;

      await prisma.group.create({
        data: {
          ...group,
          tags: {
            connect: tags.map((tag) => ({ name: tag.name })),
          },
        },
      });
    }

    await prisma.participant.createMany({
      data: PARTICIPANTS,
      skipDuplicates: true,
    });

    await prisma.record.createMany({
      data: RECORDS,
      skipDuplicates: true,
    });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
