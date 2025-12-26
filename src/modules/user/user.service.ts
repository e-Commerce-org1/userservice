import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { RESPONSE_MESSAGES } from '../../common/constants/user-messages';
import { ResponseHelper, ApiResponse } from '../../common/response.helper';
import { EmailService } from '../../provider/email/email.service';
import { RedisService } from '../../provider/redis/redis.service';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { generateOTP, generateResetToken } from '../../utils/generator.util';
import { AuthServiceGrpc } from '../../interface/user.interface';
import { CustomException } from '../../common/exceptions/user.exceptions';
import { UserDao } from './dao/user.dao';
import { LOGGER_MESSAGES } from 'src/common/constants/logger.constants';
import { ConfigService } from '@nestjs/config';
import { logMessage } from '../../utils/logger.utils';
import { OTP_WINDOW_SECONDS, MAX_OTP_ATTEMPTS } from 'src/common/constants/user.constant';
import { rateLimitOtpRequest } from '../../utils/rate-limiting.util';


@Injectable()
export class UserService implements OnModuleInit {
  private authService: AuthServiceGrpc;

  constructor(
    private readonly userDao: UserDao,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('AUTH_SERVICE') private readonly client: ClientGrpc,
    private emailService: EmailService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  private get saltRounds(): number {
    return parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10'));
  }

  async signup(dto: CreateUserDto): Promise<ApiResponse<{ userId: string }>> {
    const existingUser: UserDocument | null = await this.userDao.findUserByEmail(dto.email);
    if (existingUser) {
      logMessage('warn', LOGGER_MESSAGES.SIGNUP_FAILED, { email: dto.email });
      throw CustomException.conflict(RESPONSE_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword: string = await bcrypt.hash(dto.password, this.saltRounds);
    const userId: string = new this.userModel()._id.toString();
    const verificationToken: string = generateOTP();

    const userData = {
      ...dto,
      password: hashedPassword,
      isVerified: false,
      userId,
    };

    await Promise.all([
      this.redisService.set(`pending_user:${userId}`, JSON.stringify(userData), 60 * 60),
      this.emailService.sendVerificationEmail(dto.email, verificationToken),
      this.redisService.set(`verification:${userId}`, verificationToken, 60 * 60),
    ]);

    logMessage('info', LOGGER_MESSAGES.SIGNUP_INITIATED, { email: dto.email });
    return ResponseHelper.created(RESPONSE_MESSAGES.USER_REGISTERED_SUCCESS, { userId });
  }

  async verifyEmail(userId: string, token: string): Promise<ApiResponse> {
    const storedToken: string | null = await this.redisService.get(`verification:${userId}`);
    if (!storedToken || storedToken !== token) {
      logMessage('warn', LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_INVALID, { userId });
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }

    const userDataString: string | null = await this.redisService.get(`pending_user:${userId}`);
    if (!userDataString) {
      logMessage('warn', LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const userData= JSON.parse(userDataString);
    const createdUser: UserDocument = new this.userModel({
      ...userData,
      isVerified: true,
    });

    const savedUser: UserDocument = await createdUser.save();
    if (!savedUser) {
      logMessage('warn', LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_SAVE, { userId });
      throw CustomException.internalServererror(RESPONSE_MESSAGES.EMAIL_VERIFICATION_FAILED);
    }

    await Promise.all([
      this.redisService.del(`pending_user:${userId}`),
      this.redisService.del(`verification:${userId}`),
    ]);

    logMessage('info', LOGGER_MESSAGES.EMAIL_VERIFIED, { userId });
    return ResponseHelper.success(RESPONSE_MESSAGES.EMAIL_VERIFIED_SUCCESS);
  }

  async login(dto: LoginUserDto): Promise<
    ApiResponse<{
      user: Partial<UserDocument>;
    }>
  > {
    const user: UserDocument | null = await this.userDao.findUserByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      logMessage('warn', LOGGER_MESSAGES.LOGIN_FAILED, { email: dto.email });
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.isVerified) {
      logMessage('warn', LOGGER_MESSAGES.LOGIN_NOT_VERIFIED, { email: dto.email });
      throw CustomException.unauthorized(RESPONSE_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    if (user.isActive === 'block') {
      logMessage('warn', LOGGER_MESSAGES.LOGIN_BLOCKED, { email: dto.email });
      throw CustomException.unauthorized(RESPONSE_MESSAGES.USER_BLOCKED);
    }

    const deviceId: string = uuidv4();
    const tokens = await lastValueFrom(
      this.authService.getToken({
        email: user.email,
        deviceId: deviceId,
        entityId: user._id.toString(),
      }),
    );

    await Promise.all([
      this.userDao.updateUserActiveStatus(user._id.toString(), 'active'),
      this.userDao.updateUserDeviceId(user._id.toString(), deviceId),
    ]);

    logMessage('info', LOGGER_MESSAGES.LOGIN_SUCCESS, { email: dto.email });
    return ResponseHelper.success(RESPONSE_MESSAGES.LOGIN_SUCCESS, {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        deviceId: deviceId,
      },
      tokens,
    });
  }

  async handleGoogleLogin(googleUser: { email: string; name: string }): Promise<
    ApiResponse<{
      user: Partial<UserDocument>;
    }>
  > {
    let user = await this.userDao.findUserByEmail(googleUser.email);
    if (!user) {
      user = new this.userModel({
        email: googleUser.email,
        name: googleUser.name,
        isVerified: true,
        provider: 'google',
      });
      await user.save();
    }
    const deviceId = uuidv4();
    const tokens = await lastValueFrom(
      this.authService.getToken({
        email: user.email,
        deviceId: deviceId,
        // role: user.role || 'user',
        entityId: user._id.toString(),
      }),
    );
    await this.userDao.updateUserDeviceId(user._id.toString(), deviceId);
    return ResponseHelper.success(RESPONSE_MESSAGES.LOGIN_SUCCESS, {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        deviceId: deviceId,
      },
      tokens,
    });
  }

  async refreshTokens(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    const response: { accessToken: string } = await lastValueFrom(
      this.authService.accessToken({ refreshToken }),
    );
    return ResponseHelper.success(RESPONSE_MESSAGES.TOKEN_REFRESHED, {
      accessToken: response.accessToken,
    });
  }

  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    return await lastValueFrom(this.authService.validateToken({ accessToken: token }));
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    const user: UserDocument | null = await this.userDao.findUserById(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_CHANGE_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    if (newPassword.length < 8) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_CHANGE_TOO_SHORT, { userId });
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_TOO_SHORT);
    }

    const isMatch: boolean = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_CHANGE_INCORRECT, { userId });
      throw CustomException.unauthorized(RESPONSE_MESSAGES.INCORRECT_OLD_PASSWORD);
    }

    if (oldPassword === newPassword) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_CHANGE_SAME_OLD, { userId });
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_SAME_AS_OLD);
    }

    const hashed: string = await bcrypt.hash(newPassword, this.saltRounds);
    await this.userDao.updateUserPassword(userId, hashed);

    logMessage('info', LOGGER_MESSAGES.PASSWORD_CHANGED, { userId });
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_CHANGED_SUCCESS);
  }

  async initiatePasswordReset(email: string): Promise<ApiResponse> {
    const user: UserDocument | null = await this.userDao.findUserByEmail(email);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_RESET_NOT_FOUND, { email });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const attemptKey = `otp_attempts:${email}`;
    const attempts: number = Number(await this.redisService.get(attemptKey)) || 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_RESET_ATTEMPTS_EXCEEDED, { email });
      throw CustomException.badRequest(RESPONSE_MESSAGES.TOO_MANY_OTP_ATTEMPTS);
    }

    await rateLimitOtpRequest.call(this, email);
    const otp: string = generateOTP();
    await Promise.all([
      this.redisService.set(`password-reset:${user._id}`, otp, 15 * 60),
      this.redisService.incr(attemptKey),
      this.redisService.expire(attemptKey, 24 * 60 * 60), 
      this.emailService.sendPasswordResetOTP(email, otp),
    ]);

    logMessage('info', LOGGER_MESSAGES.PASSWORD_RESET_OTP_SENT, { email });
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_OTP_SENT);
  }

  async verifyPasswordResetOTP(
    email: string,
    otp: string,
  ): Promise<ApiResponse<{ resetToken: string }>> {
    const user: UserDocument | null = await this.userDao.findUserByEmail(email);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.OTP_VERIFICATION_NOT_FOUND, { email });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const storedOTP: string | null = await this.redisService.get(`password-reset:${user._id}`);
    if (!storedOTP || storedOTP !== otp) {
      logMessage('warn', LOGGER_MESSAGES.OTP_VERIFICATION_FAILED, { email });
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_OTP);
    }

    const resetToken: string = generateResetToken();
    await Promise.all([
      this.redisService.set(`reset-token:${user._id}`, resetToken, OTP_WINDOW_SECONDS),
      this.redisService.del(`password-reset:${user._id}`),
      this.redisService.del(`otp_attempts:${email}`), 
    ]);

    logMessage('info', LOGGER_MESSAGES.OTP_VERIFIED, { email });
    return ResponseHelper.success(RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS, { resetToken });
  }

  async resetPassword(
    email: string,
    newPassword: string,
    resetToken: string,
  ): Promise<ApiResponse> {
    const user: UserDocument | null = await this.userDao.findUserByEmail(email);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_RESET_FAILED_NOT_FOUND, { email });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const storedResetToken: string | null = await this.redisService.get(`reset-token:${user._id}`);
    if (!storedResetToken || storedResetToken !== resetToken) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_RESET_INVALID_TOKEN, { email });
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }

    if (newPassword.length < 8) {
      logMessage('warn', LOGGER_MESSAGES.PASSWORD_RESET_TOO_SHORT, { email });
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_TOO_SHORT);
    }

    const hashed: string = await bcrypt.hash(newPassword, this.saltRounds);
    await this.userModel.findByIdAndUpdate(user._id, { password: hashed });
    await this.redisService.del(`reset-token:${user._id}`);

    logMessage('info', LOGGER_MESSAGES.PASSWORD_RESET_COMPLETED, { email });
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS);
  }

  async addAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<ApiResponse<{ addresses: UserDocument['addresses'] }>> {
    const user: UserDocument | null = await this.userDao.findUserById(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.ADD_ADDRESS_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    if (dto.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(dto);
    await user.save();

    logMessage('info', LOGGER_MESSAGES.ADD_ADDRESS_SUCCESS, { userId });
    return ResponseHelper.created(RESPONSE_MESSAGES.ADDRESS_ADDED_SUCCESS, {
      addresses: user.addresses,
    });
  }

  async getUserAddresses(userId: string): Promise<ApiResponse<UserDocument['addresses']>> {
    const user: UserDocument | null = await this.userDao.findUserById(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.GET_ADDRESS_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    logMessage('info', LOGGER_MESSAGES.GET_ADDRESS_SUCCESS, { userId });
    return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESSES_RETRIEVED_SUCCESS, user.addresses);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<ApiResponse<{ address: UserDocument['addresses'][number] }>> {
    const user: UserDocument | null = await this.userDao.findUserById(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    if (dto.isDefault) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { 'addresses.$[].isDefault': false } },
      );
    }

    const updateResult = await this.userModel.updateOne(
      { _id: userId, 'addresses._id': addressId },
      {
        $set: Object.fromEntries(
          Object.entries(dto).map(([key, value]) => [`addresses.$.${key}`, value]),
        ),
      },
    );

    if (updateResult.modifiedCount === 0) {
      logMessage('warn', LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_ADDRESS, { addressId });
      throw CustomException.notFound(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    const updatedUser: UserDocument | null = await this.userDao.findUserById(userId);
    const updatedAddress = updatedUser?.addresses.find(
      (addr) => addr._id?.toString() === addressId,
    );

    if (!updatedAddress) {
      logMessage('warn', LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_ADDRESS_AFTER, { addressId });
      throw CustomException.notFound(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    logMessage('info', LOGGER_MESSAGES.UPDATE_ADDRESS_SUCCESS, { userId, addressId });
    return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_UPDATED_SUCCESS, {
      address: updatedAddress,
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<ApiResponse<null>> {
    const user: UserDocument | null = await this.userDao.findUserById(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.DELETE_ADDRESS_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const addressIndex: number = user.addresses.findIndex(
      (addr) => addr._id?.toString() === addressId,
    );
    if (addressIndex === -1) {
      logMessage('warn', LOGGER_MESSAGES.DELETE_ADDRESS_NOT_FOUND_ADDRESS, { addressId });
      throw CustomException.notFound(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    logMessage('info', LOGGER_MESSAGES.DELETE_ADDRESS_SUCCESS, { userId, addressId });
    return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_DELETED_SUCCESS, null);
  }

  async getProfile(userId: string): Promise<ApiResponse<UserDocument>> {
    const user: UserDocument | null = await this.userDao.findUserByIdWithoutPassword(userId);
    if (!user) {
      logMessage('warn', LOGGER_MESSAGES.GET_PROFILE_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    logMessage('info', LOGGER_MESSAGES.GET_PROFILE_SUCCESS, { userId });
    return ResponseHelper.success(RESPONSE_MESSAGES.PROFILE_RETRIEVED_SUCCESS, user);
  }

  async editProfile(
    userId: string,
    updateData: { name?: string; phoneNumber?: string },
  ): Promise<ApiResponse<UserDocument>> {
    const updatedUser: UserDocument | null = await this.userDao.findByIdAndUpdateWithoutPassword(
      userId,
      updateData,
    );

    if (!updatedUser) {
      logMessage('warn', LOGGER_MESSAGES.EDIT_PROFILE_NOT_FOUND, { userId });
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    logMessage('info', LOGGER_MESSAGES.EDIT_PROFILE_SUCCESS, { userId });
    return ResponseHelper.success(RESPONSE_MESSAGES.PROFILE_UPDATED_SUCCESS, updatedUser);
  }

  async logout(accessToken: string): Promise<ApiResponse<{ success: boolean }>> {
    const result: { success: boolean } = await lastValueFrom(
      this.authService.logout({ accessToken }),
    );

    if (!result.success) {
      throw new Error('Logout failed');
    }

    logMessage('info', LOGGER_MESSAGES.LOGOUT_SUCCESS, {
      token: accessToken.substring(0, 10) + '...',
    });
    return ResponseHelper.success(RESPONSE_MESSAGES.LOGOUT_SUCCESS, {
      success: result.success,
    });
  }
}
