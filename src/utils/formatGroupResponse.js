export const formatGroupResponse = (group) => {
  const owner = group.participants.find((p) => p.isOwner);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    photoUrl: group.photoUrl,
    goalRep: group.goalRep,
    discordWebhookUrl: group.discordWebhookUrl,
    discordInviteUrl: group.discordInviteUrl,
    likeCount: group.likeCount,
    tags: group.tags.map((t) => t.name),
    owner: {
      id: owner.id,
      nickname: owner.nickname,
      createdAt: owner.createdAt.getTime(),
      updatedAt: owner.updatedAt.getTime(),
    },
    participants: group.participants.map(({ isOwner, ...p }) => ({
      id: p.id,
      nickname: p.nickname,
      createdAt: p.createdAt.getTime(),
      updatedAt: p.updatedAt.getTime(),
    })),
    createdAt: group.createdAt.getTime(),
    updatedAt: group.updatedAt.getTime(),
    badges: group.badges.map((b) => b.type),
  };
};
