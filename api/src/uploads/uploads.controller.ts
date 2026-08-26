import {
  Body,
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// resource ที่อนุญาตให้แนบรูป — เพิ่มชื่อใหม่ตรงนี้เมื่อโมดูลอื่นต้องการใช้ร่วม
const ALLOWED_FOLDERS = ['shops', 'products', 'categories'] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES })
        .build({ errorHttpStatusCode: 400 }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const resolvedFolder: AllowedFolder = ALLOWED_FOLDERS.includes(
      folder as AllowedFolder,
    )
      ? (folder as AllowedFolder)
      : 'shops';

    return this.uploadsService.uploadImage(file, resolvedFolder);
  }
}
