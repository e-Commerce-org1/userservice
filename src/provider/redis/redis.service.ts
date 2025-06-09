import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';
import { logger } from '../../common/logger';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis.Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis.Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      db: this.configService.get<number>('REDIS_DB', 0),
    });

    this.redis.on('error', (error) => {
      logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connection established');
    });
  }

  async set(key: string, value: string, expiry?: number): Promise<void> {
    try {
      if (expiry) {
        await this.redis.set(key, value, 'EX', expiry);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis set error for key "${key}": ${error.message}`);
      throw error;
    }
  }
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      logger.error(`Redis get error for key "${key}": ${error.message}`);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Redis delete error for key "${key}": ${error.message}`);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis expire error for key "${key}": ${error.message}`);
      throw error;
    }
  }
  onModuleDestroy(): void {
    this.redis.disconnect();
    logger.info('Redis connection closed');
  }
}
