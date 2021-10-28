import {
  Arg,
  Authorized,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
} from 'type-graphql';
import { ApolloContext } from '../../apollo';
import { UserModel } from '../users';
import { Observation } from './model';

@InputType()
class ObservationInput implements Partial<Observation> {
  @Field()
  birdId: string;

  @Field({ nullable: true })
  listId?: number;
}

@Resolver(() => Observation)
class ObservationResolver {
  @Authorized()
  @Mutation(() => Observation)
  async addObservation(
    @Arg('data') data: ObservationInput,
    @Ctx() context: ApolloContext
  ) {
    const user = await UserModel.findById(context.session?.userId);
    if (user) {
      const observation = {
        ...data,
        date: new Date(),
      };

      user.observations?.push(observation);
      await user.save();

      return observation;
    }
  }
}

export default ObservationResolver;
