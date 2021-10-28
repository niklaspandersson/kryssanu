import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { verify } from "../../auth";
import { service, User } from '.';
import { Context } from "apollo-server-core";

@Resolver()
class UserResolver {
  @Mutation(() => User)
  async googleLogin(@Arg("token") token: string, @Ctx("ctx") ctx: Context) {
    console.log(token)
    const payload = await verify(token);
    console.log(payload)
    if(payload) {
      const googleId = payload.sub;
      let user = await service.getUserByGoogleId(googleId);
      if(!user)
        user = await service.createUser(googleId, payload.given_name ?? "");
      console.log(user);
        return user;
    }
    return null;
  }
}

export default UserResolver;