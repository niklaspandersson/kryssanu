import { buildSchema } from 'type-graphql';
import ObservationResolver from './observations/resolver';
import birdService  from "./birds/service";
import BirdResolver from './birds/resolver';
import * as Config from '../config';

async function init() {
  await birdService.load(Config.BIRDS_PATH);
  
  const schema = await buildSchema({
    resolvers: [ObservationResolver, BirdResolver],
  });

  return { schema };
}
export default init;