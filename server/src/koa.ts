import Koa from 'koa';
import session from 'koa-session';
import { ApolloServer } from 'apollo-server-koa';
import * as Config from './config';

async function createKoaApp(apolloServer: ApolloServer) {
  const app = new Koa();
  app.keys = [Config.SESSION_SECRET];

  app.use(
    session(
      {
        maxAge: 1000 * 60 * 60 * 24,
      },
      app
    )
  );

  app.use(async (ctx, next) => {
    console.log(`processing ${ctx.url}...`);
    await next();
  });

  app.use(apolloServer.getMiddleware());

  return app;
}

export default createKoaApp;