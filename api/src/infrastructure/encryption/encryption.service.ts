import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    this.key = Buffer.from(
      this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY', {
        infer: true,
      }),
      'hex',
    );
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, encrypted].map((b) => b.toString('hex')).join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
