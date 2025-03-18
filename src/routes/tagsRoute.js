import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../middleware/asyncHandler.js";

const prisma = new PrismaClient();
const router = express.Router();

router
  .route("/")
  // 태그 목록 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const tags = await prisma.tag.findMany({
        skip: offset,
        take: limitNum,
      });

      const total = await prisma.tag.count();

      const formatTagResponse = tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt.getTime(),
        updatedAt: tag.updatedAt.getTime(),
      }));

      res.status(200).json({ data: formatTagResponse, total });
    })
  );

router
  .route("/:tagId")
  // 태그 상세 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { tagId } = req.params;

      const tag = await prisma.tag.findUnique({
        where: { id: parseInt(tagId) },
      });

      const formatTagResponse = {
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt.getTime(),
        updatedAt: tag.updatedAt.getTime(),
      };

      res.status(200).json(formatTagResponse);
    })
  );

export default router;
