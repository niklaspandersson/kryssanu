import { ObjectType, Field, ID } from 'type-graphql';
import { prop, getModelForClass } from '@typegoose/typegoose';

@ObjectType()
export class Observation {
  @prop({ required: true })
  @Field()
  birdId: string;

  @prop({ required: true })
  @Field()
  date: Date;

  @prop()
  @Field({ nullable: true })
  listId?: number;
}

export const ObservationModel = getModelForClass(Observation);