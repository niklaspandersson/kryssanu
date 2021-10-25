import http from 'http';
import { ApolloServer } from 'apollo-server-koa';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';

async function startApolloServer(httpServer: http.Server, schema: GraphQLSchema) {
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  return server;
}

export default startApolloServer;