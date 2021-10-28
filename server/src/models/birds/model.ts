import { ObjectType, Field, ID } from 'type-graphql';
import { Observation } from '../observations';

@ObjectType()
class Bird {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  latin: string;

  @Field()
  family: string;

  @Field()
  rare: boolean;

  @Field(() => [Observation], { nullable: true })
  observations?: Observation[];

  @Field({ nullable: true })
  observed?: boolean;
}

export default Bird;
