import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';
import { logger } from '../../common/logger';
import { LOGGER_MESSAGES } from 'src/common/constants/logger.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis.Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis.Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB'),
    });

    this.redis.on('error', (error) => {
      logger.error(LOGGER_MESSAGES.REDIS_CONNECTION_ERROR, { error: error.message });
    });

    this.redis.on('connect', () => {
      logger.info(LOGGER_MESSAGES.REDIS_CONNECTION_SUCCESS, {
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      });
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
      logger.error(LOGGER_MESSAGES.REDIS_SET_ERROR, { key, error: error.message });
      throw error;
    }
  }
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.REDIS_GET_ERROR, { key, error: error.message });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.REDIS_DEL_ERROR, { key, error: error.message });
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.REDIS_EXPIRE_ERROR, { key, seconds, error: error.message });
      throw error;
    }
  }
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.REDIS_INCR_ERROR, { key, error: error.message });
      throw error;
    }
  }
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.REDIS_TTL_ERROR, { key, error: error.message });
      throw error;
    }
  }
  onModuleDestroy(): void {
    this.redis.disconnect();
    logger.info(LOGGER_MESSAGES.REDIS_DISCONNECTED, {
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
    });
  }
}
