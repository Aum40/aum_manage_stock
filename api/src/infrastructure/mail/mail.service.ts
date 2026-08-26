import { EnvVariable } from '@/config/env.validation';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', { infer: true }),
      port: this.configService.get('SMTP_PORT', { infer: true }),
      secure: this.configService.get('SMTP_PORT', { infer: true }) === 465,
      auth: {
        user: this.configService.get('SMTP_USER', { infer: true }),
        pass: this.configService.get('SMTP_PASS', { infer: true }),
      },
    });
  }

  private get frontendUrl(): string {
    return this.configService
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', { infer: true }),
      to,
      subject: 'ตั้งรหัสผ่านใหม่ — Aum Manage Stocks',
      html: `<p>กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>ลิงก์นี้จะหมดอายุในไม่ช้า หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>`,
    });
  }

  async sendEmailVerification(to: string, verificationToken: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', { infer: true }),
      to,
      subject: 'ยืนยันอีเมลของคุณ — Aum Manage Stocks',
      html: `<p>ขอบคุณที่สมัครใช้งาน Aum Manage Stocks</p><p>กดลิงก์ด้านล่างเพื่อยืนยันอีเมลและเริ่มใช้งาน</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>หากคุณไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>`,
    });
  }

  async sendEmailChangeVerification(to: string, verificationToken: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', { infer: true }),
      to,
      subject: 'ยืนยันอีเมลใหม่ — Aum Manage Stocks',
      html: `<p>มีคำขอเปลี่ยนอีเมลใน Aum Manage Stocks</p><p>กดลิงก์ด้านล่างเพื่อยืนยันอีเมลใหม่นี้</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  }
}
