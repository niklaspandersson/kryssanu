import ObservationResolver from './observations/resolver';
import birdService from './birds/service';
import BirdResolver from './birds/resolver';
import * as Config from '../config';
import UserResolver from './users/resolver';
import { BuildSchemaOptions } from 'type-graphql';

async function init(): Promise<BuildSchemaOptions> {
  await birdService.load(Config.BIRDS_PATH);
  return {
    resolvers: [ObservationResolver, BirdResolver, UserResolver],
  };
}
export default init;
