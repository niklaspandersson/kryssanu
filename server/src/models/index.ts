import { buildSchema } from 'type-graphql';
import ObservationResolver from './observations/resolver';
import birdService  from "./birds/service";
import BirdResolver from './birds/resolver';
import * as Config from '../config';
import UserResolver from './users/resolver';

async function init() {
  await birdService.load(Config.BIRDS_PATH);
  
  const schema = await buildSchema({
    resolvers: [ObservationResolver, BirdResolver, UserResolver],
  });

  return { schema };
}
export default init;