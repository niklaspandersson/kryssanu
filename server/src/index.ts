import 'reflect-metadata';
import Koa from 'koa';
import http from 'http';
import { ApolloServer } from 'apollo-server-koa';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';

import initModels from './models';
import * as Config from './config';

async function startApolloServer(schema: GraphQLSchema) {
  const httpServer = http.createServer();

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  const app = new Koa();
  app.use(server.getMiddleware());

  httpServer.on('request', app.callback());
  await new Promise<void>(resolve => httpServer.listen({ host: Config.LISTEN_HOST, port: Config.PORT }, resolve));
  console.log(`🚀 GraphQL endpoint ready at http://${Config.LISTEN_HOST}:${Config.PORT}${server.graphqlPath}`);
  return { server, app };
}

async function bootstrap() {
  const { schema } = await initModels();
  const { server, app } = await startApolloServer(schema);
}

bootstrap();