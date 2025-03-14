import { Prisma } from "@prisma/client";

export const asyncHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    if (
      e.name === "StructError" ||
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    ) {
      res.status(400).send({ message: e.message });
    } else if (e instanceof Prisma.PrismaClientValidationError) {
      res.status(422).send({ message: e.message });
    } else if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      res.status(404).send({ message: e.message });
    } else {
      res.status(500).send({ message: e.message });
    }
  }
};
