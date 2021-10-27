import Koa from 'koa';
import session from 'koa-session';
import { ApolloServer } from 'apollo-server-koa';
import * as Config from './config';
import Router from 'koa-router';

async function createKoaApp(apolloServer:ApolloServer) {
  const app = new Koa();
  app.keys = [Config.SESSION_SECRET];

  app.use(session({
    
  }, app));
  
  app.use(async (ctx, next) => {
    console.log(`processing ${ctx.url}...`);
    await next();
  });

  app.use(apolloServer.getMiddleware());

  const testRouter = new Router({ prefix: '/test' });
  testRouter.get('/', async (ctx) => {
    console.log(ctx.session);
    ctx.status = 204;
  });
  app.use(testRouter.routes());

  return app;
}

export default createKoaApp;