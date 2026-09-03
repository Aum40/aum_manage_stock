import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from './config/env.validation';

async function bootstrap() {
  // rawBody จำเป็นสำหรับตรวจลายเซ็น LINE webhook (line-webhook.controller.ts)
  // — Stripe ไม่ได้ใช้แล้ว การชำระเงินยืนยันผ่าน POST /payments/:id/confirm
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService<EnvVariable, true>);
  app.enableCors({
    origin: configService.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
