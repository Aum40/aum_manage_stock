import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../config/env.validation';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL', { infer: true }),
    });

    super({ adapter });
  }
}
