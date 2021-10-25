import Router from 'koa-router';
import parser from 'koa-bodyparser';
import { OAuth2Client } from 'google-auth-library';
import * as Config from './config';

/**
* Create a new OAuth2Client, and go through the OAuth2 content
* workflow.  Return the full client to the callback.
*/
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
      const payload = ticket.getPayload();
      console.log(payload);
    }

    const router = new Router({
      prefix: '/login_redirect'
    });

    router.post('/', parser(), async (ctx) => {
      console.log(ctx);
      verify(ctx.request.body?.['credential']);
      ctx.redirect('/');
    });

    resolve(router);
  });
};

export default setupGoogleAuth;