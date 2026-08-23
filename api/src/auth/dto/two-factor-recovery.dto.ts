import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFactorRecoveryDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsString()
  @IsNotEmpty()
  recoveryCode: string;
}
