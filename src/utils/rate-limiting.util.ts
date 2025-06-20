import { CustomException } from 'src/common/exceptions/user.exceptions';
import { MAX_OTP_ATTEMPTS, OTP_WINDOW_SECONDS } from 'src/common/constants/user.constant';

export async function rateLimitOtpRequest(
  this: { redisService: any },
  email: string,
): Promise<void> {
  const key = `otp-requests:${email}`;
  const attempts = await this.redisService.incr(key);

  if (attempts === 1) {
    await this.redisService.expire(key, OTP_WINDOW_SECONDS);
  }

  if (attempts > MAX_OTP_ATTEMPTS) {
    const ttl = await this.redisService.ttl(key);
    throw CustomException.tooManyRequests(`Too many OTP requests. Try again in ${ttl} seconds.`);
  }
}
