const express = require('express');
const serverless = require('serverless-http');
const next = require('next');

let cachedHandler;

async function bootstrap() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const app = next({
    dev: false,
    dir: process.cwd(),
  });

  await app.prepare();
  const nextHandler = app.getRequestHandler();

  const expressApp = express();

  // Minimal health endpoint for quick infra checks.
  expressApp.get('/_health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  expressApp.use((req, res) => nextHandler(req, res));

  cachedHandler = serverless(expressApp, {
    provider: 'aws',
  });

  return cachedHandler;
}

exports.handler = async (event, context) => {
  const handler = await bootstrap();
  return handler(event, context);
};
