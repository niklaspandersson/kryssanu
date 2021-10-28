import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import * as Config from './config';

async function createServer() {
  const server = Config.USE_HTTPS
    ? https.createServer({
        cert: await fs.readFile(Config.DEV_HTTPS_CERT_FILE, {
          encoding: 'ascii',
        }),
        key: await fs.readFile(Config.DEV_HTTPS_PRIVATE_KEY_FILE, {
          encoding: 'ascii',
        }),
      })
    : http.createServer();

  return server;
}

export default createServer;
