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

  getObservedBirds: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const list = await ctx.prisma.observation.findMany({
      select: { birdId: true },
      distinct: ['birdId'],
      where: { userId },
    });

    const result: Record<string, boolean> = {};
    list.forEach(bird => (result[bird.birdId] = true));
    return result;
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
  registerObservation: protectedProcedure
    .input(z.object({ birdId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.observation.create({
        data: {
          birdId: input.birdId,
          userId: ctx.session.user.id,
          date: new Date(),
        },
      });
    }),
});
