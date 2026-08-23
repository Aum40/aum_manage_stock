import { EnvVariable } from '@/config/env.validation';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GoogleProfile = {
  googleId: string;
  displayName: string;
  /** SRS §85/§96 — ต้องดึง email จาก Google มาบันทึกเสมอ */
  email: string | null;
};

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  async exchangeCodeForProfile(
    code: string,
    redirectUri: string,
  ): Promise<GoogleProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.configService.get('GOOGLE_CLIENT_ID', {
          infer: true,
        }),
        client_secret: this.configService.get('GOOGLE_CLIENT_SECRET', {
          infer: true,
        }),
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Invalid Google authorization code');
    }

    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${access_token}` } },
    );

    if (!profileRes.ok) {
      throw new UnauthorizedException('Failed to fetch Google profile');
    }

    const profile = (await profileRes.json()) as {
      sub: string;
      name: string;
      email?: string;
      email_verified?: boolean;
    };

    return {
      googleId: profile.sub,
      displayName: profile.name,
      // รับเฉพาะอีเมลที่ Google ยืนยันแล้ว ไม่งั้นจะเป็นช่องให้ยึดบัญชีคนอื่น
      email: profile.email_verified ? (profile.email ?? null) : null,
    };
  }
}
