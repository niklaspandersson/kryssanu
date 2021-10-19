import { Arg, Field, InputType, Mutation, Query, Resolver } from "type-graphql";
import { Observation } from "../models";

const TestObservations:Observation[] = [
  {
    userId: 'testUser',
    birdId: 'pica pica',
    date: new Date('2021-01-01'),
  },
  {
    userId: 'testUser',
    birdId: 'grus grus',
    date: new Date('2021-02-01'),
  },
];

@InputType()
class AddObservationInput implements Partial<Observation> {
  @Field()
  birdId: string;

  @Field({ nullable: true })
  listId?: number;
}

@Resolver()
class ObservationResolver {
  @Query(() => [Observation])
  async observations() {
    return Promise.resolve(TestObservations);
  }

  @Mutation(() => Observation)
  async addObservation(@Arg("data") newObservationData: AddObservationInput) {
    // sample implementation
    const observation:Observation = {
      ...newObservationData,
      date: new Date(),
      userId: 'testUser',
    };
    TestObservations.push(observation);
    return observation;
  }
}

export default ObservationResolver;