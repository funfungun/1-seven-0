import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { assert } from "superstruct";
import {
  CreateGroup,
  PatchGroup,
  CreateParticipant,
  PatchParticipant,
  DeleteParticipant,
  CreateRecord,
} from "../middleware/struct.js";

const prisma = new PrismaClient();
const router = express.Router();

router
  .route("/")
  // 그룹 목록 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const {
        page = 1,
        limit = 10,
        order = "desc",
        orderBy = "createdAt",
        search = "",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      if (!["asc", "desc"].includes(order)) {
        return res.status(400).send({
          message:
            "The order parameter must be one of the following values: ['asc', 'desc'].",
        });
      }

      if (!["likeCount", "participantCount", "createdAt"].includes(orderBy)) {
        return res.status(400).send({
          message: `The orderBy parameter must be one of the following values: ['likeCount', 'participantCount', 'createdAt'].`,
        });
      }

      let orderByOption = { createdAt: order };
      if (orderBy === "createdAt") {
        orderByOption = { createdAt: order };
      } else if (orderBy === "likeCount") {
        orderByOption = { likeCount: order };
      } else if (orderBy === "participantCount") {
        orderByOption = { participants: { _count: order } };
      }

      const groups = await prisma.group.findMany({
        skip: offset,
        take: parseInt(limit),
        orderBy: orderByOption,
        where: {
          name: { contains: search, mode: "insensitive" },
        },
        include: {
          participants: {
            select: {
              id: true,
              nickname: true,
              createdAt: true,
              updatedAt: true,
              isOwner: true,
            },
          },
          tags: {
            select: { name: true },
          },
        },
      });

      const formattedGroups = groups.map((group) => {
        const owner = group.participants.find((p) => p.isOwner) || null;
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          photoUrl: group.photoUrl,
          goalRep: group.goalRep,
          discordWebhookUrl: group.discordWebhookUrl,
          discordInviteUrl: group.discordInviteUrl,
          likeCount: group.likeCount,
          tags: group.tags.map((tag) => tag.name),
          owner: owner
            ? {
                id: owner.id,
                nickname: owner.nickname,
                createdAt: owner.createdAt.getTime(),
                updatedAt: owner.updatedAt.getTime(),
              }
            : null,
          participants: group.participants.map(({ isOwner, ...p }) => p),
          createdAt: group.createdAt.getTime(),
          updatedAt: group.updatedAt.getTime(),
          badges: group.badges,
        };
      });

      const total = await prisma.group.count({
        where: {
          name: { contains: search, mode: "insensitive" },
        },
      });

      res.status(200).send({ data: formattedGroups, total });
    })
  )
  // 그룹 생성 API
  .post(
    asyncHandler(async (req, res) => {
      const { ownerNickname, ownerPassword, ...groupsData } = req.body;
      assert(groupsData, CreateGroup);
      const {
        name,
        description,
        photoUrl,
        goalRep,
        discordWebhookUrl,
        discordInviteUrl,
        tags,
      } = groupsData;
      assert(
        { nickname: ownerNickname, password: ownerPassword },
        CreateParticipant
      );

      const existingParticipant = await prisma.participant.findUnique({
        where: { nickname: ownerNickname },
      });

      if (existingParticipant) {
        return res.status(400).send({ message: "Nickname already taken" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: {
            name,
            description,
            photoUrl,
            goalRep,
            discordWebhookUrl,
            discordInviteUrl,
            tags: {
              connectOrCreate: tags.map((tag) => ({
                where: { name: tag.name },
                create: { name: tag.name },
              })),
            },
          },
        });

        await tx.participant.create({
          data: {
            nickname: ownerNickname,
            password: ownerPassword,
            isOwner: true,
            groupId: group.id,
          },
        });

        return group;
      });

      res.status(201).json(result);
    })
  );

router
  .route("/:groupId")
  // 그룹 상세 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;

      const group = await prisma.group.findUnique({
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

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const owner = group.participants.find((p) => p.isOwner) || null;
      const response = {
        id: group.id,
        name: group.name,
        description: group.description,
        photoUrl: group.photoUrl,
        goalRep: group.goalRep,
        discordWebhookUrl: group.discordWebhookUrl,
        discordInviteUrl: group.discordInviteUrl,
        likeCount: group.likeCount,
        tags: group.tags.map((t) => t.name),
        owner: owner
          ? {
              id: owner.id,
              nickname: owner.nickname,
              createdAt: owner.createdAt.getTime(),
              updatedAt: owner.updatedAt.getTime(),
            }
          : null,
        participants: group.participants.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          createdAt: p.createdAt.getTime(),
          updatedAt: p.updatedAt.getTime(),
        })),
        createdAt: group.createdAt.getTime(),
        updatedAt: group.updatedAt.getTime(),
        badges: group.badges.map((b) => b.type),
      };

      res.status(200).json(response);
    })
  )
  // 그룹 수정 API
  .patch(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      const { ownerNickname, ownerPassword, ...groupData } = req.body;
      assert(groupData, PatchGroup);
      assert(
        { nickname: ownerNickname, password: ownerPassword },
        PatchParticipant
      );
      const {
        name,
        description,
        photoUrl,
        goalRep,
        discordWebhookUrl,
        discordInviteUrl,
        tags,
      } = groupData;

      const existingGroup = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
        include: { participants: true },
      });

      if (!existingGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      const owner = existingGroup.participants.find(
        (participant) => participant.isOwner
      );

      if (!owner) {
        return res
          .status(404)
          .json({ message: "Owner not found in participants" });
      }

      const updatedGroup = await prisma.$transaction(async (tx) => {
        const group = await tx.group.update({
          where: { id: parseInt(groupId) },
          data: {
            name,
            description,
            photoUrl,
            goalRep,
            discordWebhookUrl,
            discordInviteUrl,
            tags: {
              set: [],
              connectOrCreate: tags.map((tag) => ({
                where: { name: tag.name },
                create: { name: tag.name },
              })),
            },
          },
        });

        await tx.participant.update({
          where: { id: owner.id },
          data: {
            nickname: ownerNickname,
            password: ownerPassword,
          },
        });

        return group;
      });

      res.status(200).json(updatedGroup);
    })
  )
  // 그룹 삭제 API
  .delete(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      const { ownerPassword } = req.body;
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
        include: { participants: true },
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const owner = group.participants.find((p) => p.isOwner);

      if (!owner) {
        return res
          .status(404)
          .json({ message: "Owner not found in participants" });
      }

      if (owner.password !== ownerPassword) {
        return res.status(401).json({ message: "Wrong password" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.participant.deleteMany({
          where: { groupId: group.id },
        });

        await tx.group.delete({
          where: { id: parseInt(groupId) },
        });
      });

      res.status(200).json({ message: "Group deleted successfully" });
    })
  );

router
  .route("/:groupId/participants")
  // 그룹 참여 API
  .post(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      assert(req.body, CreateParticipant);
      const { nickname, password } = req.body;
      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
        include: { participants: true },
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const existingParticipant = group.participants.find(
        (p) => p.nickname === nickname
      );

      if (existingParticipant) {
        return res.status(400).json({ message: "Already joined the group" });
      }

      const participant = await prisma.participant.create({
        data: {
          nickname,
          password,
          groupId: group.id,
        },
      });

      res.status(201).json(participant);
    })
  )
  // 그룹 참여 취소 API
  .delete(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      assert(req.body, DeleteParticipant);
      const { nickname, password } = req.body;

      const participant = await prisma.participant.findFirst({
        where: { groupId: parseInt(groupId), nickname, password },
      });

      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      if (participant.isOwner) {
        return res
          .status(400)
          .json({ message: "Owner cannot leave the group" });
      }

      await prisma.participant.delete({ where: { id: participant.id } });
      res.status(200).json({ message: "Successfully left the group" });
    })
  );

router
  .route("/:groupId/rank")
  // 그룹 랭킹 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      const { period = "weekly", page = 1, limit = 10 } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const now = new Date();
      let startDate;

      if (period === "weekly") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "monthly") {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else {
        return res
          .status(400)
          .json({ message: "Invalid period. Use 'weekly' or 'monthly'." });
      }

      const participants = await prisma.participant.findMany({
        where: { groupId: parseInt(groupId) },
        include: {
          records: {
            where: {
              createdAt: {
                gte: startDate,
              },
            },
            select: {
              id: true,
              time: true,
            },
          },
        },
      });

      const rankings = participants.map((participant) => {
        const recordCount = participant.records.length;
        const totalTime = participant.records.reduce(
          (acc, record) => acc + record.time,
          0
        );

        return {
          participantId: participant.id,
          nickname: participant.nickname,
          recordCount,
          recordTime: totalTime,
        };
      });

      rankings.sort(
        (a, b) => b.recordCount - a.recordCount || b.recordTime - a.recordTime
      );

      const paginatedRankings = rankings.slice(offset, offset + limitNum);
      const total = rankings.length;

      res.status(200).json(paginatedRankings);
    })
  );

router
  .route("/:groupId/records")
  // 그룹 운동 기록 목록 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;
      const {
        page = 1,
        limit = 10,
        order = "desc",
        orderBy = "createdAt",
        search = "",
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      let orderByField;
      switch (orderBy) {
        case "time":
          orderByField = { time: order };
          break;
        case "createdAt":
          orderByField = { createdAt: order };
          break;
        default:
          orderByField = { createdAt: "desc" };
      }

      const where = {
        author: {
          groupId: parseInt(groupId),
          ...(search
            ? {
                nickname: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {}),
        },
      };

      const records = await prisma.record.findMany({
        where,
        orderBy: orderByField,
        skip: offset,
        take: limitNum,
        select: {
          id: true,
          exerciseType: true,
          description: true,
          time: true,
          distance: true,
          photos: true,
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      const total = await prisma.record.count({
        where,
      });

      res.send({ data: records, total });
    })
  )
  // 그룹 운동 기록 생성 API
  .post(
    asyncHandler(async (req, res) => {
      if (isNaN(req.params.groupId)) {
        return res.status(400).json({ message: "groupId must be integer" });
      }

      if (req.body.exerciseType) {
        req.body.exerciseType = req.body.exerciseType.toUpperCase();
      }

      const { authorNickname, authorPassword, ...recordData } = req.body;
      assert(recordData, CreateRecord);
      const { groupId } = req.params;
      const { exerciseType, description, time, distance, photos } = recordData;

      const participant = await prisma.participant.findFirst({
        where: {
          nickname: authorNickname,
          password: authorPassword,
          groupId: Number(groupId),
        },
        include: { group: true },
      });

      if (!participant) {
        return res
          .status(403)
          .send({ message: "그룹에 등록된 참가자가 아닙니다." });
      }

      const record = await prisma.record.create({
        data: {
          exerciseType,
          description: description || null,
          time,
          distance,
          photos,
          authorId: participant.id,
        },
        select: {
          id: true,
          exerciseType: true,
          description: true,
          time: true,
          distance: true,
          photos: true,
          author: {
            select: { id: true, nickname: true },
          },
        },
      });

      const discordWebhookUrl = participant.group.discordWebhookUrl;
      const groupName = participant.group.name;

      if (discordWebhookUrl) {
        try {
          await axios.post(discordWebhookUrl, {
            embeds: [
              {
                title: "새로운 운동 기록 등록!",
                description: `**그룹**: ${groupName}`,
                fields: [
                  { name: "운동 종류", value: exerciseType, inline: true },
                  { name: "작성자", value: authorNickname, inline: true },
                  { name: "시간", value: `${time}분`, inline: true },
                  { name: "거리", value: `${distance}km`, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          });
        } catch (e) {
          console.error("디스코드 웹훅 전송 실패:", e);
        }
      }

      res.status(201).send(record);
    })
  );

router
  .route("/:groupId/records/:recordId")
  // 그룹 운동 기록 상세 조회 API
  .get(
    asyncHandler(async (req, res) => {
      const { groupId, recordId } = req.params;

      const record = await prisma.record.findUnique({
        where: {
          id: parseInt(recordId),
        },
        select: {
          id: true,
          exerciseType: true,
          description: true,
          time: true,
          distance: true,
          photos: true,
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      if (!record) {
        return res
          .status(404)
          .json({ message: "운동 기록을 찾을 수 없습니다." });
      }

      res.status(200).json(record);
    })
  );

router
  .route("/:groupId/likes")
  // 그룹 추천(좋아요) API
  .post(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;

      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const updatedGroup = await prisma.group.update({
        where: { id: parseInt(groupId) },
        data: {
          likeCount: { increment: 1 },
        },
      });

      res.status(201).json(updatedGroup);
    })
  )
  // 그룹 추천 취소 (좋아요 취소)
  .delete(
    asyncHandler(async (req, res) => {
      const { groupId } = req.params;

      const group = await prisma.group.findUnique({
        where: { id: parseInt(groupId) },
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const updatedGroup = await prisma.group.update({
        where: { id: parseInt(groupId) },
        data: {
          likeCount: { decrement: 1 },
        },
      });

      res.status(200).json(updatedGroup);
    })
  );

export default router;
