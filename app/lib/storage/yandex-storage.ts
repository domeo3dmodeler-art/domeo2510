// lib/storage/yandex-storage.ts
// Профессиональная система хранения файлов для Yandex Object Storage
// Оптимизирована для работы с большими объемами изображений товаров

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';

// Конфигурация Yandex Object Storage
const s3Client = new S3Client({
  endpoint: process.env.YANDEX_STORAGE_ENDPOINT || 'https://storage.yandexcloud.net',
  region: process.env.YANDEX_STORAGE_REGION || 'ru-central1',
  credentials: {
    accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_STORAGE_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.YANDEX_STORAGE_BUCKET_NAME || 'domeo-products';

// Типы файлов
export enum FileType {
  PRODUCT_IMAGE = 'product-images',
  DOCUMENT = 'documents',
  TEMP = 'temp',
}

// Интерфейс для результата загрузки
export interface UploadResult {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

// Интерфейс для конфигурации изображения
export interface ImageConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  generateThumbnail?: boolean;
}

export class YandexStorageService {
  /**
   * Генерирует уникальное имя файла
   */
  private generateFileName(originalName: string, prefix?: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const prefixStr = prefix ? `${prefix}/` : '';
    
    return `${prefixStr}${timestamp}_${hash}_${cleanName}${ext}`;
  }

  /**
   * Загружает файл в Yandex Object Storage
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    originalName: string,
    fileType: FileType,
    options: {
      contentType?: string;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<UploadResult> {
    try {
      const filename = this.generateFileName(originalName, fileType);
      const contentType = options.contentType || 'application/octet-stream';

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: file,
        ContentType: contentType,
        Metadata: options.metadata || {},
        // Настройки кэширования для изображений
        CacheControl: contentType.startsWith('image/') 
          ? 'public, max-age=31536000' 
          : 'public, max-age=3600',
      });

      await s3Client.send(command);

      const url = `https://${BUCKET_NAME}.storage.yandexcloud.net/${filename}`;

      return {
        filename,
        url,
        size: file.length,
        mimeType: contentType,
      };
    } catch (error) {
      console.error('Error uploading file to Yandex Storage:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Загружает и оптимизирует изображение
   */
  async uploadImage(
    file: Buffer,
    originalName: string,
    fileType: FileType,
    config: ImageConfig = {}
  ): Promise<UploadResult & { thumbnailUrl?: string }> {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format = 'jpeg',
        generateThumbnail = true,
      } = config;

      // Обработка основного изображения
      let processedImage = sharp(file);
      
      // Получаем метаданные
      const metadata = await processedImage.metadata();
      
      // Изменяем размер если нужно
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          processedImage = processedImage.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Конвертируем в нужный формат
      switch (format) {
        case 'jpeg':
          processedImage = processedImage.jpeg({ quality });
          break;
        case 'png':
          processedImage = processedImage.png({ quality });
          break;
        case 'webp':
          processedImage = processedImage.webp({ quality });
          break;
      }

      const processedBuffer = await processedImage.toBuffer();
      const contentType = `image/${format}`;

      // Загружаем основное изображение
      const result = await this.uploadFile(
        processedBuffer,
        originalName,
        fileType,
        { contentType }
      );

      // Добавляем размеры
      const finalMetadata = await sharp(processedBuffer).metadata();
      result.width = finalMetadata.width;
      result.height = finalMetadata.height;

      // Генерируем миниатюру если нужно
      if (generateThumbnail) {
        const thumbnailBuffer = await sharp(processedBuffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailResult = await this.uploadFile(
          thumbnailBuffer,
          `thumb_${originalName}`,
          fileType,
          { contentType: 'image/jpeg' }
        );

        result.thumbnailUrl = thumbnailResult.url;
      }

      return result;
    } catch (error) {
      console.error('Error processing and uploading image:', error);
      throw new Error('Failed to process and upload image');
    }
  }

  /**
   * Удаляет файл из хранилища
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from Yandex Storage:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Генерирует подписанную URL для временного доступа к файлу
   */
  async getSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Проверяет существование файла
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Получает размер файла
   */
  async getFileSize(filename: string): Promise<number | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      });

      const response = await s3Client.send(command);
      return response.ContentLength || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Загружает несколько файлов параллельно
   */
  async uploadMultipleFiles(
    files: Array<{
      buffer: Buffer;
      originalName: string;
      fileType: FileType;
      config?: ImageConfig;
    }>
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => {
      if (file.config) {
        return this.uploadImage(file.buffer, file.originalName, file.fileType, file.config);
      } else {
        return this.uploadFile(file.buffer, file.originalName, file.fileType);
      }
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Очищает временные файлы старше указанного времени
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<void> {
    // Эта функция требует дополнительной реализации с использованием ListObjects
    // Для простоты пока оставляем заглушку
    console.log(`Cleanup temp files older than ${olderThanHours} hours`);
  }
}

// Экспортируем экземпляр сервиса
export const storageService = new YandexStorageService();

// Утилиты для работы с файлами
export class FileUtils {
  /**
   * Валидирует тип файла
   */
  static isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(mimeType);
  }

  /**
   * Валидирует размер файла
   */
  static isValidFileSize(size: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * Получает расширение файла из MIME типа
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    
    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Генерирует хеш файла для проверки целостности
   */
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
