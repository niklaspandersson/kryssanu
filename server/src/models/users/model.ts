import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  addedAt: Date;

  @Field()
  updatedAt: Date;
}

export default User;