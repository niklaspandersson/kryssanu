import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
class Observation {
  @Field(() => ID)
  userId: string;

  @Field()
  birdId: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  listId?: number;
}

export default Observation;