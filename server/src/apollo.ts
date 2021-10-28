import http from 'http';
import Koa from 'koa';
import { ApolloServer } from 'apollo-server-koa';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { AuthChecker, buildSchema, BuildSchemaOptions } from 'type-graphql';

export type ApolloContext = {
  session: Koa.Context['session'];
}

const authChecker: AuthChecker<ApolloContext> = ({ context }) => {
  return !!context?.session?.userId;     
}

async function startApolloServer(httpServer: http.Server, opts: BuildSchemaOptions) {
  const schema = await buildSchema({ 
    ...opts, 
    authChecker,
    authMode: 'null',
  });
  
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    context: ({ctx}: { ctx: Koa.Context }): ApolloContext => {
      return { session: ctx.session };
    },
  });
  await server.start();
  return server;
}

export default startApolloServer;