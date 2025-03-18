import * as s from "superstruct";

export const CreateParticipant = s.object({
  nickname: s.size(s.string(), 1, 20),
  password: s.size(s.string(), 8, 20),
});

export const PatchParticipant = s.partial(CreateParticipant);
export const DeleteParticipant = s.partial(CreateParticipant);

export const CreateGroup = s.object({
  name: s.size(s.string(), 1, 60),
  description: s.optional(s.string()),
  photoUrl: s.optional(s.string()),
  //goalRep: s.min(s.integer(), 1),
  discordWebhookUrl: s.optional(s.string()),
  discordInviteUrl: s.optional(s.string()),
  tags: s.array(s.string()),
});

export const PatchGroup = s.partial(CreateGroup);

export const CreateRecord = s.object({
  exerciseType: s.enums(["RUN", "BIKE", "SWIM"]),
  description: s.optional(s.string()),
  time: s.min(s.integer(), 1),
  distance: s.min(s.number(), 0),
  photos: s.size(s.array(s.string()), 1, 5),
});

export const CreateTag = s.object({
  name: s.size(s.string(), 1, 30),
});

export const BadgeTypeEnum = s.enums([
  "PARTICIPATION_10",
  "RECORD_100",
  "LIKE_100",
]);

export const ExerciseTypeEnum = s.enums(["RUN", "BIKE", "SWIM"]);

export const RankDurationEnum = s.enums(["MONTHLY", "WEEKLY"]);
