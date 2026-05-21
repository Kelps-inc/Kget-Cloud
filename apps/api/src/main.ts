import "./register-paths";
import { NestFactory } from "@nestjs/core";

async function bootstrap() {
  const [{ AppModule }, { configureApp }] = await Promise.all([
    import("./app.module"),
    import("./configure-app"),
  ]);
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
