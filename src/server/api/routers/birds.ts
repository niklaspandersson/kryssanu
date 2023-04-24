import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '~/server/api/trpc';

export const birdsRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.bird.findMany();
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return 'you can now see this secret message!';
  }),
});
