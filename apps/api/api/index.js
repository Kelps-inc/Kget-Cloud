const express = require("express");
const { NestFactory } = require("@nestjs/core");
const { ExpressAdapter } = require("@nestjs/platform-express");

let cachedServer;

async function getServer() {
  if (cachedServer) return cachedServer;

  const { AppModule } = require("../dist/src/app.module");
  const { configureApp } = require("../dist/src/configure-app");
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn", "log"],
  });
  configureApp(app);
  await app.init();

  cachedServer = server;
  return server;
}

module.exports = async function handler(req, res) {
  const server = await getServer();
  return server(req, res);
};
