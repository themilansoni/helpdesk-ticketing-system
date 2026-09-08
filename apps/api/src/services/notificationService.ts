import { prisma } from "@helpdesk/database";
import type { NotificationType } from "@helpdesk/shared";
import { emailProvider } from "../lib/email/index.js";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  sendEmail?: boolean;
}

// Creates an in-app notification and, when requested, fires the abstracted
// email provider too (mock provider by default in local development).
export async function notifyUser(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  if (input.sendEmail) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (user) {
      await emailProvider.send({
        to: user.email,
        subject: input.title,
        text: input.message,
      });
    }
  }

  return notification;
}

export async function notifyManyUsers(userIds: string[], input: Omit<CreateNotificationInput, "userId">) {
  const uniqueIds = [...new Set(userIds)];
  await Promise.all(uniqueIds.map((userId) => notifyUser({ ...input, userId })));
}
