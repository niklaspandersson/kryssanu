import { getModelForClass } from '@typegoose/typegoose';
import { ObjectType, Field, ID } from 'type-graphql';
import { Observation } from '../observations';

@ObjectType()
export class Bird {
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

export const BirdModel = getModelForClass(Bird);
