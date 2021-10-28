import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { verify } from "../../auth";
import { User, UserModel } from '.';
import { ApolloContext } from '../../apollo';

@Resolver()
class UserResolver {
  @Authorized()
  @Query(() => User, { nullable: true })
  async user(@Ctx() ctx: ApolloContext) {
    return await UserModel.findById(ctx.session?.userId);
  }

  @Mutation(() => User)
  async googleLogin(@Arg("token") token: string, @Ctx() ctx: ApolloContext) {
    console.log(ctx);
    const payload = await verify(token);
    if(payload) {
      const googleId = payload.sub;
      let user = await UserModel.findOne({ googleId });
      if(!user) {
        const now = new Date();
        user = await UserModel.create({ 
          googleId, 
          name: payload.given_name ?? "", 
          createdAt: now, 
          lastLoggedInAt: now 
        });
      }
      if(ctx.session)
        ctx.session.userId = user._id;
      return user;
    }
    return null;
  }
}

export default UserResolver;