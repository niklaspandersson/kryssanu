import { OAuth2Client } from 'google-auth-library';
import * as Config from './config';

const oAuth2Client = new OAuth2Client(
  Config.GOOGLE_CLIENT_ID,
  Config.GOOGLE_CLIENT_SECRET,
  Config.GOOGLE_OAUTH_REDIRECT_URL,
);
export async function verify(token:string) {
  const ticket = await oAuth2Client.verifyIdToken({
      idToken: token,
      audience: Config.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}