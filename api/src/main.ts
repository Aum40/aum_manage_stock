import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aum Manage Stocks API')
    .setDescription('API documentation for the Aum Manage Stocks backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  SwaggerModule.setup('api', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
