export const NOTIFICATION_TYPES = {
  ALBUM_CREATED: 'ALBUM_CREATED',
  ALBUM_UPDATED: 'ALBUM_UPDATED',
  ALBUM_DELETED: 'ALBUM_DELETED',
  MEDIA_UPLOADED: 'MEDIA_UPLOADED',
  MEDIA_DELETED: 'MEDIA_DELETED',
};

export async function createNotificationsForOtherUsers(
  tx,
  { actorUserId, type, message, albumId = null, mediaId = null },
) {
  if (!type || !message) {
    return;
  }

  const where = actorUserId
    ? { id: { not: actorUserId } }
    : {};

  const recipients = await tx.user.findMany({
    where,
    select: { id: true },
  });

  if (recipients.length === 0) {
    return;
  }

  await tx.notification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      type,
      message,
      albumId,
      mediaId,
    })),
  });
}
