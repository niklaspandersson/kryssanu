import Koa from 'koa';
import proxy from 'koa-proxies';
import { ApolloServer } from 'apollo-server-koa';
import * as Config from './config';
import setupGoogleAuth from './auth';

async function createKoaApp(apolloServer:ApolloServer) {
  const app = new Koa();
  app.use(async (ctx, next) => {
    console.log(`processing ${ctx.url}...`);
    await next();
  });
  app.use(apolloServer.getMiddleware());
  const authRouter = await setupGoogleAuth();
  app.use(authRouter.routes());
  
  if(Config.DEV_HTTP_PROXY) {
    app.use(proxy('/', {
      target: Config.DEV_HTTP_PROXY,
      changeOrigin: true,
    }));
  }

  return app;
}

export default createKoaApp;