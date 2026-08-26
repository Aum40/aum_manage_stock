import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import type { EnvVariable } from '../config/env.validation';

@Injectable()
export class UploadsService {
  constructor(configService: ConfigService<EnvVariable, true>) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: configService.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: configService.get('CLOUDINARY_API_SECRET', { infer: true }),
    });
  }

  uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `aum-stocks/${folder}` },
        (error, result) => {
          if (error || !result) {
            reject(
              new Error(
                error?.message ?? 'Cloudinary upload returned no result',
              ),
            );
            return;
          }
          resolve({ url: result.secure_url });
        },
      );
      stream.end(file.buffer);
    });
  }
}
