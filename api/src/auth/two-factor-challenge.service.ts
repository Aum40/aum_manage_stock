import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type TwoFactorChallengePayload = { sub: string };

const CHALLENGE_EXPIRES_IN = '5m';

@Injectable()
export class TwoFactorChallengeService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  sign(userId: string) {
    const payload: TwoFactorChallengePayload = { sub: userId };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('TWO_FACTOR_CHALLENGE_SECRET', {
        infer: true,
      }),
      expiresIn: CHALLENGE_EXPIRES_IN,
    });
  }

  verify(token: string): Promise<TwoFactorChallengePayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('TWO_FACTOR_CHALLENGE_SECRET', {
        infer: true,
      }),
    });
  }
}
