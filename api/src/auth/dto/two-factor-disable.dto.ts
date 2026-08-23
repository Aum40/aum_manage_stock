import { IsNotEmpty, IsString, Length, ValidateIf } from 'class-validator';

export class TwoFactorDisableDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @ValidateIf((dto: TwoFactorDisableDto) => !dto.recoveryCode)
  @IsString()
  @Length(6, 6)
  otpCode?: string;

  @ValidateIf((dto: TwoFactorDisableDto) => !dto.otpCode)
  @IsString()
  @IsNotEmpty()
  recoveryCode?: string;
}
