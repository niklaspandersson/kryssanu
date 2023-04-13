import 'reflect-metadata';
import gracefulShutdown from 'http-graceful-shutdown';
import createHttpServer from './server';
import initModels from './models';
import startApolloServer from './apollo';
import createKoaApp from './koa';
import * as Config from './config';
import mongoose from 'mongoose';

async function bootstrap() {
  console.dir(Config);
  try {
    if (Config.IS_DEV) {
      mongoose.set('debug', true);
    }

    await mongoose.connect(Config.MONGODB_URI, {
      dbName: Config.MONGODB_DBNAME,
      user: Config.MONGODB_USER,
      pass: Config.MONGODB_PASSWORD,
    });

    const httpServer = await createHttpServer();
    gracefulShutdown(httpServer);

    const apolloServer = await startApolloServer(
      httpServer,
      await initModels()
    );
    const app = await createKoaApp(apolloServer);

    httpServer.on('request', app.callback());
    await new Promise<void>(resolve =>
      httpServer.listen(
        { host: Config.LISTEN_HOST, port: Config.PORT },
        resolve
      )
    );
    console.log(
      `🚀 GraphQL endpoint ready at ${Config.USE_HTTPS ? 'https' : 'http'}://${
        Config.LISTEN_HOST
      }:${Config.PORT}${apolloServer.graphqlPath}`
    );
  } catch (e: any) {
    console.error('CRITICAL: Failed to start ---v');
    console.error(e);
  }
}

bootstrap();
