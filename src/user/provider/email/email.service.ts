import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { logger } from '../../common/logger'

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
    // const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: `"${appName}" <${this.configService.get<string>('EMAIL_FROM')}>`,
        to,
        subject: `Verify Your Email for ${appName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to ${appName}!</h2>
            <p>Thank you for signing up. To complete your registration, please verify your email address using the verification code below:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${token}
            </div>
            
            <p>The verification code will expire in 1 hour.</p>
            
            <p>If you didn't create an account on ${appName}, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
        `,
      });

      logger.info(`Verification email sent to: ${to}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendPasswordResetOTP(to: string, otp: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Our App');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: `"${appName}" <${this.configService.get<string>('EMAIL_FROM')}>`,
        to,
        subject: `Password Reset OTP for ${appName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password for ${appName}. Use the OTP below to reset your password:</p>
            
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            
            <p>This OTP will expire in 15 minutes.</p>
            
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The ${appName} Team</p>
          </div>
        `,
      });

      logger.info(`Password reset OTP sent to: ${to}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Failed to send password reset OTP to ${to}: ${error.message}`);
      throw error;
    }
  }
}
