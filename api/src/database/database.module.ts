import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SqlScriptsRunner } from './sql-scripts.runner';

@Global()
@Module({
  providers: [PrismaService, SqlScriptsRunner],
  exports: [PrismaService],
})
export class DatabaseModule {}
