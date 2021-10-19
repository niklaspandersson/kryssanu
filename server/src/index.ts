import "reflect-metadata";
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import ObservationResolver from './resolvers/observations';

async function startApolloServer() {
  const schema = await buildSchema({
    resolvers: [ObservationResolver],
  });

  const server = new ApolloServer({ schema });
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);
}

startApolloServer().then(() => console.log('Done!'));