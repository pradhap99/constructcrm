import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/**
 * StorageService — S3-compatible file storage (ADR-002, ADR-004)
 *
 * Works with AWS S3, Cloudflare R2, or MinIO.
 * Configure S3_ENDPOINT in .env for R2/MinIO.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'civiliq-documents');

    const endpoint = config.get<string>('S3_ENDPOINT');
    this.client = new S3Client({
      region: config.get<string>('S3_REGION', 'ap-south-1'),
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID', 'local'),
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY', 'local'),
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    this.logger.debug(`Uploaded: ${key}`);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    const stream = response.Body as Readable;
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Generate a presigned URL for direct client-side download (15 minutes expiry).
   */
  async presignedDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /**
   * Generate a presigned URL for direct client-side upload (mobile app photo uploads).
   */
  async presignedUploadUrl(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    );
  }
}
