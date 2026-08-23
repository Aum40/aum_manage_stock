import { EnvVariable } from '@/config/env.validation';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LineProfile = {
  lineUserId: string;
  displayName: string;
};

@Injectable()
export class LineAuthService {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  async exchangeCodeForProfile(
    code: string,
    redirectUri: string,
  ): Promise<LineProfile> {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.configService.get('LINE_LOGIN_CHANNEL_ID', {
          infer: true,
        }),
        client_secret: this.configService.get('LINE_LOGIN_CHANNEL_SECRET', {
          infer: true,
        }),
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Invalid LINE authorization code');
    }

    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedException('Failed to fetch LINE profile');
    }

    const profile = (await profileRes.json()) as {
      userId: string;
      displayName: string;
    };

    return {
      lineUserId: profile.userId,
      displayName: profile.displayName,
    };
  }
}
