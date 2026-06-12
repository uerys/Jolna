import { z } from "zod";
import { anyRoleProcedure, router } from "../_core/trpc";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../db";

export const notificationsRouter = router({
  listMine: anyRoleProcedure.query(({ ctx }) =>
    listNotificationsForUser(ctx.user.id, { limit: 10 })
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
});
