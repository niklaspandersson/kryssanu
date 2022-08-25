import { Ctx, Query, Resolver } from 'type-graphql';
import { ApolloContext } from '../../apollo';
import { UserModel } from '../users';
import { Bird, BirdModel } from './model';

@Resolver()
class BirdResolver {
  @Query(() => [Bird])
  async birds(@Ctx() ctx: ApolloContext) {
    const birds = await BirdModel.find({ rare: false });
    if (ctx.session?.userId) {
      const user = await UserModel.findById(ctx.session.userId);
      const observedIds = user?.observations?.map(o => o.birdId) ?? [];
      const uniqueObserved = [...new Set(observedIds)];

      return birds.map(b => ({
        ...b,
        observed: uniqueObserved.includes(b.id),
      }));
    }
    return birds;
  }
}

export default BirdResolver;
