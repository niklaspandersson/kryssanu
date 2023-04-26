import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '~/server/api/trpc';

export const birdsRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.bird.findMany({
      where: {
        visitor: false,
      },
      orderBy: {
        swedish: 'asc',
      },
    });
  }),

  getObservedBirds: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.prisma.observation.findMany({
      select: { birdId: true },
      distinct: ['birdId'],
      where: { userId },
    });
  }),

  getOne: publicProcedure
    .input(
      z.object({
        birdId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.bird.findFirst({
        where: { id: input.birdId },
      });
    }),

  getObservations: protectedProcedure
    .input(
      z.object({
        birdId: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.prisma.observation.findMany({
        where: { userId, birdId: input.birdId },
      });
    }),
});
