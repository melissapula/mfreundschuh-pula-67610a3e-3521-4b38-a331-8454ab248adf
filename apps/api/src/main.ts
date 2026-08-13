import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    // No `credentials: true` — auth is a Bearer token in a header, sent
    // explicitly by our own HttpClient code, not a cookie the browser
    // attaches automatically. Credentialed CORS isn't needed and would
    // only widen the attack surface for no benefit here.
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
