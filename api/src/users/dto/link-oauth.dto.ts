import { IsNotEmpty, IsString } from 'class-validator';

export class LinkOAuthDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
