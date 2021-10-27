import Router from 'koa-router';
import parser from 'koa-bodyparser';
import { OAuth2Client } from 'google-auth-library';
import { service } from './models/users';
import * as Config from './config';

function setupGoogleAuth() {
  return new Promise<Router>((resolve, reject) => {
    const oAuth2Client = new OAuth2Client(
      Config.GOOGLE_CLIENT_ID,
      Config.GOOGLE_CLIENT_SECRET,
      Config.GOOGLE_OAUTH_REDIRECT_URL,
    );
    async function verify(token:string) {
      const ticket = await oAuth2Client.verifyIdToken({
          idToken: token,
          audience: Config.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    }

    const router = new Router({
      prefix: '/auth'
    });

    router.post('/google_login', parser(), async (ctx) => {
      try {
        const payload = await verify(ctx.request.body?.['idToken']);
        if(payload) {
          const googleId = payload.sub;
          let user = await service.getUserByGoogleId(googleId);
          if(!user)
            user = await service.createUser(googleId, payload.given_name ?? "");

        }
        ctx.status = 204;
      }
      catch(err) {
        console.error(err);
        ctx.status = 400;
      }
    });

    resolve(router);
  });
};

export default setupGoogleAuth;