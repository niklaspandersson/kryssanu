import { Query, Resolver } from "type-graphql";
import Bird from "./model";
import service from './service';

@Resolver()
class BirdResolver {
  @Query(() => [Bird])
  birds() {
    return service.birds;
  }
}

export default BirdResolver;