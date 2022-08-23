import Koa from 'koa';
import session from 'koa-session';
import serve from 'koa-static';
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

  if (Config.IS_DEV) {
    app.use(async (ctx, next) => {
      console.log(`processing ${ctx.url}...`);
      await next();
    });

    if (Config.DEV_FAKE_USER_ID) {
      app.use(async (ctx, next) => {
        if (!ctx.session?.userId) ctx.session!.userId = Config.DEV_FAKE_USER_ID;
        await next();
      });
    }
  }

  app.use(apolloServer.getMiddleware());

  if (Config.WWW_ROOT) {
    app.use(serve(Config.WWW_ROOT));
  }

  return app;
}

export default createKoaApp;
