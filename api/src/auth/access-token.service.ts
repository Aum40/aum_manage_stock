import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  sign(payload: AccessTokenPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRES_IN', {
        infer: true,
      }),
    });
  }

  verify(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
    });
  }
}
