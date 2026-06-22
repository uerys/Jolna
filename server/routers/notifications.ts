import { z } from "zod";
import { anyRoleProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  createNotification,
} from "../db";

export const notificationsRouter = router({
  listMine: anyRoleProcedure.query(({ ctx }) =>
    listNotificationsForUser(ctx.user.id, { limit: 50 })
  ),

  unreadCount: anyRoleProcedure.query(({ ctx }) =>
    countUnreadNotifications(ctx.user.id)
  ),

  markRead: anyRoleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      markNotificationAsRead(input.id, ctx.user.id)
    ),

  markAllRead: anyRoleProcedure.mutation(({ ctx }) =>
    markAllNotificationsAsRead(ctx.user.id)
  ),

  sendChat: anyRoleProcedure
    .input(
      z.object({
        recipientId: z.number().int().positive(),
        text: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const senderName = ctx.user.name ?? ctx.user.email ?? "Someone";
      const href =
        ctx.user.role === "physiotherapist" ? "/chat" : `/chat/${ctx.user.id}`;

      await createNotification({
        recipientId: input.recipientId,
        actorId: ctx.user.id,
        type: "new_message",
        title: `New message from ${senderName}`,
        content:
          input.text.length > 100
            ? `${input.text.slice(0, 100)}...`
            : input.text,
        href,
      });

      return { success: true };
    }),

  markChatRead: anyRoleProcedure
    .input(z.object({ senderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) return { success: false };
      await dbInstance
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.recipientId, ctx.user.id),
            eq(notifications.actorId, input.senderId),
            eq(notifications.type, "new_message"),
            sql`${notifications.readAt} is null`
          )
        );
      return { success: true };
    }),
});
