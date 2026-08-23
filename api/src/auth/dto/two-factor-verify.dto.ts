import { IsNotEmpty, IsString, Length } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otpCode: string;
}
