import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { EnvVariable } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aum Manage Stocks API')
    .setDescription('ระบบจัดการสต็อกสินค้าหลังบ้านสำหรับร้านค้ารายย่อย')
    .setVersion('0.1.0')
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig)),
  );

  const configService = app.get(ConfigService<EnvVariable, true>);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
  new Logger('Bootstrap').log(`Swagger UI: http://localhost:${port}/docs`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
