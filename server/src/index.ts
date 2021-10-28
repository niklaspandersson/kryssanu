import 'reflect-metadata';
import createHttpServer from './server';
import initModels from './models';
import startApolloServer from './apollo';
import createKoaApp from './koa';
import * as Config from './config';
import mongoose from 'mongoose';

async function bootstrap() {
  try {
    mongoose.set('debug', true);
    await mongoose.connect(Config.MONGODB_URI);

    const httpServer = await createHttpServer();
    const schemaOptions = await initModels();
    const apolloServer = await startApolloServer(httpServer, schemaOptions);
    const app = await createKoaApp(apolloServer);
  
    httpServer.on('request', app.callback());
    await new Promise<void>(resolve => httpServer.listen({ host: Config.LISTEN_HOST, port: Config.PORT }, resolve));
    console.log(`🚀 GraphQL endpoint ready at ${Config.USE_HTTPS ? "https" : "http"}://${Config.LISTEN_HOST}:${Config.PORT}${apolloServer.graphqlPath}`);
  }
  catch(e:any) {
    console.error('CRITICAL: Failed to start:');
    console.error(e);
  }
}

bootstrap();