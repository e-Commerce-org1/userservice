import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { logger } from '../../common/logger';
import {
  verificationEmailSubject,
  verificationEmailTemplate,
} from './template/verification-email.template';
import { passwordResetSubject, passwordResetTemplate } from './template/password-reset.template';
import { LOGGER_MESSAGES } from 'src/common/constants/logger.constants';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Our App');
    const from = this.configService.get<string>('EMAIL_FROM');

    try {
      await this.transporter.sendMail({
        from: `"${appName}" <${from}>`,
        to,
        subject: verificationEmailSubject(appName),
        html: verificationEmailTemplate(appName, token),
      });

      logger.info(LOGGER_MESSAGES.EMAIL_VERIFICATION_SENT, { to });
    } catch (error) {
      logger.error(LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED, { to, error: error.message });
      throw error;
    }
  }

  async sendPasswordResetOTP(to: string, otp: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Our App');
    const from = this.configService.get<string>('EMAIL_FROM');

    try {
      await this.transporter.sendMail({
        from: `"${appName}" <${from}>`,
        to,
        subject: passwordResetSubject(appName),
        html: passwordResetTemplate(appName, otp),
      });

      logger.info(LOGGER_MESSAGES.PASSWORD_RESET_OTP_SENT, { to });
    } catch (error) {
      logger.error(LOGGER_MESSAGES.PASSWORD_RESET_OTP_FAILED, { to, error: error.message });
      throw error;
    }
  }
}
