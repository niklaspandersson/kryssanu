import 'reflect-metadata';
import createHttpServer from './server';
import initModels from './models';
import startApolloServer from './apollo';
import createKoaApp from './koa';
import * as Config from './config';

async function bootstrap() {
  const httpServer = await createHttpServer();
  const schemaOptions = await initModels();
  const apolloServer = await startApolloServer(httpServer, schemaOptions);
  const app = await createKoaApp(apolloServer);

  httpServer.on('request', app.callback());
  await new Promise<void>(resolve => httpServer.listen({ host: Config.LISTEN_HOST, port: Config.PORT }, resolve));
  console.log(`🚀 GraphQL endpoint ready at ${Config.USE_HTTPS ? "https" : "http"}://${Config.LISTEN_HOST}:${Config.PORT}${apolloServer.graphqlPath}`);
}

bootstrap();