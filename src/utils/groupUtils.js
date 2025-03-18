import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getFullGroup = async (groupId) => {
  return prisma.group.findUnique({
    where: { id: parseInt(groupId) },
    include: {
      tags: { select: { name: true } },
      participants: {
        select: {
          id: true,
          nickname: true,
          createdAt: true,
          updatedAt: true,
          isOwner: true,
        },
      },
    },
  });
};
