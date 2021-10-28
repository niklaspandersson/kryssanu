import { ObjectType, Field } from 'type-graphql';
import { prop, getModelForClass } from '@typegoose/typegoose';
import { Observation } from '../observations';

@ObjectType()
export class User {
  @prop()
  googleId: string;

  @prop({ required: true })
  @Field()
  name: string;

  @prop({ required: true })
  @Field()
  createdAt: Date;

  @prop({ required: true })
  @Field()
  lastLoggedInAt: Date;

  @prop({ type: () => Observation })
  @Field(() => [Observation])
  observations?: Observation[];
}

export const UserModel = getModelForClass(User);