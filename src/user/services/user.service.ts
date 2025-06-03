import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { RESPONSE_MESSAGES } from '../common/user-messages';
import { ResponseHelper, ApiResponse } from '../common/response.helper';
import { logger } from '../common/logger';
import { EmailService } from '../provider/email/email.service';
import { RedisService } from '../provider/redis/redis.service';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { generateOTP } from '../utils/generateOtp';
import { generateResetToken } from '../utils/gen-reset-token';
import { AuthServiceGrpc } from '../interface/user.interface';

@Injectable()
export class UserService implements OnModuleInit {
  private authService: AuthServiceGrpc;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('AUTH_SERVICE') private readonly client: ClientGrpc,
    private emailService: EmailService,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  async signup(dto: CreateUserDto): Promise<ApiResponse<{ userId: string }>> {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      logger.warn(`Signup failed: User already exists - ${dto.email}`);
      throw new ConflictException(RESPONSE_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const createdUser = new this.userModel({
      ...dto,
      password: hashedPassword,
      isVerified: false,
    });

    try {
      const result = await createdUser.save();
      const verificationToken = generateOTP();

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      await this.redisService.set(`verification:${result._id}`, verificationToken, 60 * 60);
      await this.emailService.sendVerificationEmail(dto.email, verificationToken);

      logger.info(`User signed up and verification email sent: ${dto.email}`);
      return ResponseHelper.created(RESPONSE_MESSAGES.USER_REGISTERED_SUCCESS, {
        userId: result._id.toString(),
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Signup error: ${error.message}`);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.SIGNUP_FAILED);
    }
  }

  async verifyEmail(userId: string, token: string): Promise<ApiResponse> {
    const storedToken = await this.redisService.get(`verification:${userId}`);
    if (!storedToken || storedToken !== token) {
      logger.warn(`Email verification failed: Invalid token for user ${userId}`);
      throw new BadRequestException(RESPONSE_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true },
    );
    if (!updatedUser) {
      logger.warn(`Email verification failed: User not found - ${userId}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    await this.redisService.del(`verification:${userId}`);
    logger.info(`Email verified for user: ${userId}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.EMAIL_VERIFIED_SUCCESS);
  }

  async login(dto: LoginUserDto): Promise<
    ApiResponse<{
      user: Partial<UserDocument>;
      tokens: { accessToken: string; refreshToken: string };
    }>
  > {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      logger.warn(`Login failed for: ${dto.email}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    }
    if (!user.isVerified) {
      logger.warn(`Login failed: User not verified - ${dto.email}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.EMAIL_NOT_VERIFIED);
    }
    if(user.isActive=='block'){
      logger.warn(`Login failed: User not verified - ${dto.email}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.USER_BLOCKED);
    }
    try {
      const deviceId = uuidv4();
      const tokens = await lastValueFrom(
        this.authService.getToken({
          email: user.email,
          deviceId: deviceId,
          role: user.role || 'user',
          userId: user._id.toString(),
        }),
      );
      await this.userModel.findByIdAndUpdate(user._id,{isActive:'active'}, { deviceId: deviceId });
      logger.info(`User logged in: ${dto.email}`);
      return ResponseHelper.success(RESPONSE_MESSAGES.LOGIN_SUCCESS, {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          role: user.role,
          deviceId: deviceId,
        },
        tokens,
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Login error during token generation: ${error.message}`);
      throw new InternalServerErrorException(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    }
  }

  async handleGoogleLogin(googleUser: any) {
    try {
      // Find user by email
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      let user = await this.userModel.findOne({ email: googleUser.email });

      // If user does not exist, create a new user
      if (!user) {
        user = new this.userModel({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          email: googleUser.email,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          name: googleUser.name,
          isVerified: true,
          // You may want to set a flag or provider field
          provider: 'google',
          // picture: googleUser.picture,
        });
        await user.save();
      }

      // Generate deviceId for this session
      const deviceId = uuidv4();

      // Request tokens from AuthService via gRPC
      const tokens = await lastValueFrom(
        this.authService.getToken({
          email: user.email,
          deviceId: deviceId,
          role: user.role || 'user',
          userId: user._id.toString(),
        }),
      );

      // Update deviceId in user record (optional)
      await this.userModel.findByIdAndUpdate(user._id, { deviceId });

      // Return user info and tokens
      return {
        message: 'Google login successful',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          // picture: user.picture,
          isVerified: user.isVerified,
          role: user.role,
          deviceId,
        },
        tokens,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException('Google login failed');
    }
  }

  async refreshTokens(
// userId: string,
// deviceId: string,
refreshToken: string,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    try {
      const response = await lastValueFrom(
        this.authService.refreshToken({
          refreshToken,
        }),
      );
      return ResponseHelper.success('Token refreshed successfully', {
        accessToken: response.accessToken,
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Token refresh error: ${error.message}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }
  }

  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    userId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    try {
      const response = await lastValueFrom(this.authService.validateToken({ accessToken: token }));
      console.log(response);
      return response;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      logger.error(`Token validation error: ${error.message}`);
      throw new UnauthorizedException(RESPONSE_MESSAGES.INVALID_TOKEN);
    }
  }

  async changePassword(
    userId: string,
    // token: string,
    // // currentPassword: string,
    newPassword: string,
    //changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      logger.warn(`Password change failed: User not found - ${userId}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    // const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    // if (!isPasswordValid) {
    //   logger.warn(`Password change failed: Invalid current password for user ${userId}`);
    //   throw new UnauthorizedException(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    // }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed });
    logger.info(`Password changed for userId: ${userId}`);

    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_CHANGED_SUCCESS);
  }

  async initiatePasswordReset(email: string): Promise<ApiResponse> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      logger.warn(`Password reset initiation failed: User not found - ${email}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const otp = generateOTP();
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await this.redisService.set(`password-reset:${user._id}`, otp, 15 * 60);
    await this.emailService.sendPasswordResetOTP(email, otp);

    logger.info(`Password reset OTP sent to: ${email}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_OTP_SENT);
  }

  async verifyPasswordResetOTP(
    email: string,
    otp: string,
  ): Promise<ApiResponse<{ resetToken: string }>> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      logger.warn(`OTP verification failed: User not found - ${email}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const storedOTP = await this.redisService.get(`password-reset:${user._id}`);
    if (!storedOTP || storedOTP !== otp) {
      logger.warn(`OTP verification failed for user: ${email}`);
      throw new BadRequestException(RESPONSE_MESSAGES.INVALID_OTP);
    }

    const resetToken = generateResetToken();
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await this.redisService.set(`reset-token:${user._id}`, resetToken, 10 * 60);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await this.redisService.del(`password-reset:${user._id}`);

    logger.info(`OTP verified for password reset: ${email}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS, { resetToken });
  }

  async resetPassword(
    email: string,
    newPassword: string,
    resetToken: string,
  ): Promise<ApiResponse> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      logger.warn(`Password reset failed: User not found - ${email}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const storedResetToken = await this.redisService.get(`reset-token:${user._id}`);
    if (!storedResetToken || storedResetToken !== resetToken) {
      logger.warn(`Password reset failed: Invalid reset token for user ${email}`);
      throw new BadRequestException(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(user._id, { password: hashed });
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await this.redisService.del(`reset-token:${user._id}`);

    logger.info(`Password reset completed for email: ${email}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS);
  }

  async resendVerificationEmail(email: string): Promise<ApiResponse> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      logger.warn(`Resend verification failed: User not found - ${email}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    if (user.isVerified) {
      logger.warn(`Resend verification failed: User already verified - ${email}`);
      throw new BadRequestException(RESPONSE_MESSAGES.USER_ALREADY_VERIFIED);
    }

    const verificationToken = generateOTP();
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await this.redisService.set(`verification:${user._id}`, verificationToken, 60 * 60);
    await this.emailService.sendVerificationEmail(email, verificationToken);

    logger.info(`Verification email resent to: ${email}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.VERIFICATION_EMAIL_SENT);
  }
async addAddress(
  userId: string,
  dto: CreateAddressDto,
): Promise<ApiResponse<{ addresses: UserDocument['addresses'] }>> {
  const user = await this.userModel.findById(userId);
  if (!user) {
    logger.warn(`Add address failed: User not found - ${userId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  // If this address is set as default, make all other addresses non-default
  if (dto.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push(dto);
  await user.save();

  logger.info(`Address added for userId: ${userId}`);
  return ResponseHelper.created(RESPONSE_MESSAGES.ADDRESS_ADDED_SUCCESS, {
    addresses: user.addresses,
  });
}

async getUserAddresses(userId: string): Promise<ApiResponse<UserDocument['addresses']>> {
  const user = await this.userModel.findById(userId);
  if (!user) {
    logger.warn(`Get addresses failed: User not found - ${userId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  logger.info(`Fetched addresses for userId: ${userId}`);
  return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESSES_RETRIEVED_SUCCESS, user.addresses);
}

async updateAddress(
  userId: string,
  addressId: string,
  dto: UpdateAddressDto,
): Promise<ApiResponse<{ address: UserDocument['addresses'][number] }>> {
  const user = await this.userModel.findById(userId);
  if (!user) {
    logger.warn(`Update address failed: User not found - ${userId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
  if (addressIndex === -1) {
    logger.warn(`Update address failed: Address not found - ${addressId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
  }

  // If setting this address as default, make all other addresses non-default
  if (dto.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  // Update the address
  Object.assign(user.addresses[addressIndex], dto);
  await user.save();

  logger.info(`Address updated for userId: ${userId}, addressId: ${addressId}`);
  return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_UPDATED_SUCCESS, {
    address: user.addresses[addressIndex],
  });
}

async deleteAddress(userId: string, addressId: string): Promise<ApiResponse<null>> {
  const user = await this.userModel.findById(userId);
  if (!user) {
    logger.warn(`Delete address failed: User not found - ${userId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
  if (addressIndex === -1) {
    logger.warn(`Delete address failed: Address not found - ${addressId}`);
    throw new NotFoundException(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
  }

  user.addresses.splice(addressIndex, 1);
  await user.save();

  logger.info(`Address deleted for userId: ${userId}, addressId: ${addressId}`);
  return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_DELETED_SUCCESS, null);
}

  async getProfile(userId: string): Promise<ApiResponse<UserDocument>> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      logger.warn(`Get user failed: User not found - ${userId}`);
      throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    logger.info(`Fetched user by ID: ${userId}`);
    return ResponseHelper.success(RESPONSE_MESSAGES.PROFILE_RETRIEVED_SUCCESS, user);
  }

  async logout(accessToken: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const result = await lastValueFrom(
      this.authService.logout({
        accessToken,
      }),
    );
    
    if (!result.success) {
      throw new Error('Logout failed');
    }
    
    logger.info(`User logged out successfully with token: ${accessToken.substring(0, 10)}...`);
    return ResponseHelper.success(RESPONSE_MESSAGES.LOGOUT_SUCCESS, {
      success: result.success,
    });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    logger.error(`Logout error: ${error.message}, token: ${accessToken.substring(0, 10)}...`);
    throw new InternalServerErrorException(RESPONSE_MESSAGES.LOGOUT_FAILED);
  }
}

}
