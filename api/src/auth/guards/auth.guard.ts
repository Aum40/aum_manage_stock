import { AccessTokenService } from '@/auth/access-token.service';
import { IS_PUBLIC_KEY } from '@/common/decorator/public.decorator';
import { PrismaService } from '@/database/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const [bearer, token] = request.headers.authorization?.split(' ') ?? [];
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    try {
      request.user = await this.accessTokenService.verify(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }

    await this.assertAccountStillUsable(request.user.sub);
    return true;
  }

  /**
   * access token เป็น JWT ที่ตรวจได้แค่ "ลายเซ็นถูกและยังไม่หมดอายุ" เท่านั้น
   * เพิกถอนกลางคันไม่ได้ ต่างจาก refresh token ที่เก็บเป็นแถวใน DB
   *
   * แปลว่าถ้าไม่เช็คตรงนี้ พนักงานที่เพิ่งถูกลบหรือบัญชีที่แอดมินเพิ่งระงับ
   * จะยังยิง API ได้ต่อจนกว่า token ใบในมือจะหมดอายุ ทั้งที่หน้าเว็บขึ้นว่า
   * ลบไปแล้ว — การ revoke refresh token อย่างเดียวปิดแค่การ "ต่ออายุ"
   * ไม่ได้ปิดใบที่ออกไปแล้ว
   *
   * ราคาคือ query เดียวต่อ request ที่ select แค่สองคอลัมน์จาก primary key
   * ซึ่งถูกกว่าการปล่อยให้บัญชีที่ถูกตัดสิทธิ์ยังทำรายการได้มาก
   */
  private async assertAccountStillUsable(userId: string): Promise<void> {
    const account = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { status: true },
    });

    if (!account) {
      throw new UnauthorizedException('This account no longer exists');
    }
    if (account.status !== 'ACTIVE') {
      throw new ForbiddenException({
        message: 'บัญชีนี้ถูกระงับการใช้งาน',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
  }
}
