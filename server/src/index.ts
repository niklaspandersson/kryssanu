import 'reflect-metadata';
import { ApolloServer } from 'apollo-server-koa';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { buildSchema } from 'type-graphql';
import Koa from 'koa';
import KoaJWT from 'koa-jwt';
import http from 'http';
import ObservationResolver from './resolvers/observations';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000; 
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0';

async function startApolloServer() {
  const httpServer = http.createServer();
  const schema = await buildSchema({
    resolvers: [ObservationResolver],
  })
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  const app = new Koa();
  app.use(server.getMiddleware());

  httpServer.on('request', app.callback());
  await new Promise<void>(resolve => httpServer.listen({ host:HOSTNAME, port: PORT }, resolve));
  console.log(`🚀 Server ready at http://${HOSTNAME}:${PORT}${server.graphqlPath}`);
  return { server, app };
}

startApolloServer();