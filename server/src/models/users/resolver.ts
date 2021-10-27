import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { verify } from "../../auth";
import { service, User } from '.';
import { Context } from "apollo-server-core";

@Resolver()
class UserResolver {
  @Mutation(() => User)
  async googleLogin(@Arg("data") data: string, @Ctx("ctx") ctx: Context) {
    const payload = await verify(data);
    if(payload) {
      const googleId = payload.sub;
      let user = await service.getUserByGoogleId(googleId);
      if(!user)
        user = await service.createUser(googleId, payload.given_name ?? "");

        return user;
    }
    return null;
  }
}

export default UserResolver;