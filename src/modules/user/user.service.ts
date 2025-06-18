import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
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
import { logger } from '../../common/logger';
import { EmailService } from '../../provider/email/email.service';
import { RedisService } from '../../provider/redis/redis.service';
import { ClientGrpc } from '@nestjs/microservices';
import {  lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { generateOTP } from '../../utils/generateOtp';
import { generateResetToken } from '../../utils/gen-reset-token';
import { AuthServiceGrpc } from '../../interface/user.interface';
import {CustomException} from '../../common/exceptions/user.exceptions'
import { UserDao } from './dao/user.dao';
import { LOGGER_MESSAGES } from 'src/common/constants/logger.constants';
import { ConfigService } from '@nestjs/config';

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

  async signup(dto: CreateUserDto): Promise<ApiResponse<{ userId: string }>> {
    const existingUser = await this.userDao.findUserByEmail(dto.email);
    if (existingUser) {
      logger.warn(LOGGER_MESSAGES.SIGNUP_FAILED.replace('{email}', dto.email));
      throw CustomException.conflict(RESPONSE_MESSAGES.EMAIL_ALREADY_EXISTS);

    }
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS','10'));

    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    const userId = new this.userModel()._id.toString();
    const verificationToken = generateOTP();
    
    const userData = {
      ...dto,
      password: hashedPassword,
      isVerified: false,
      userId,
    };
    try {
      await Promise.all([
        this.redisService.set(`pending_user:${userId}`, JSON.stringify(userData), 60 * 60),
        this.emailService.sendVerificationEmail(dto.email, verificationToken),
        this.redisService.set(`verification:${userId}`, verificationToken, 60 * 60),
      ]);
      logger.info(LOGGER_MESSAGES.SIGNUP_INITIATED.replace('{email}', dto.email));
      return ResponseHelper.created(RESPONSE_MESSAGES.USER_REGISTERED_SUCCESS, { userId });
    } catch (error) {
      logger.error(LOGGER_MESSAGES.SIGNUP_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.SIGNUP_FAILED);
    }
  }

async verifyEmail(userId: string, token: string): Promise<ApiResponse> {
  try {
    const storedToken = await this.redisService.get(`verification:${userId}`);
    if (!storedToken) {
      logger.warn(LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_TOKEN.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }
    if (storedToken !== token) {
      logger.warn(LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_INVALID.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_VERIFICATION_TOKEN);
    }

    const userDataString = await this.redisService.get(`pending_user:${userId}`);
    if (!userDataString) {
      logger.warn(LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_NOT_FOUND.replace('{userId}', userId));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const userData = JSON.parse(userDataString);
    const createdUser = new this.userModel({
      ...userData,
      isVerified: true,
    });

    const savedUser = await createdUser.save();
    if (!savedUser) {
      logger.warn(LOGGER_MESSAGES.EMAIL_VERIFICATION_FAILED_SAVE.replace('{userId}', userId));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.EMAIL_VERIFICATION_FAILED);
    }

    await Promise.all([
      this.redisService.del(`pending_user:${userId}`),
      this.redisService.del(`verification:${userId}`),
    ]);
    logger.info(LOGGER_MESSAGES.EMAIL_VERIFIED.replace('{userId}', userId));
    return ResponseHelper.success(RESPONSE_MESSAGES.EMAIL_VERIFIED_SUCCESS);
  } catch (error) {
    logger.error(LOGGER_MESSAGES.EMAIL_VERIFICATION_ERROR.replace('{error}', error.message));
    throw CustomException.internalServererror(RESPONSE_MESSAGES.EMAIL_VERIFICATION_FAILED);
  }
}
  async login(dto: LoginUserDto): Promise<
    ApiResponse<{
      user: Partial<UserDocument>;
      tokens: { accessToken: string; refreshToken: string };
    }>
  > {
    const user = await this.userDao.findUserByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      logger.warn(LOGGER_MESSAGES.LOGIN_FAILED.replace('{email}', dto.email));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    }
    if (!user.isVerified) {
      logger.warn(LOGGER_MESSAGES.LOGIN_NOT_VERIFIED.replace('{email}', dto.email));
      throw CustomException.unauthorized(RESPONSE_MESSAGES.EMAIL_NOT_VERIFIED);
    }
    if(user.isActive=='block'){
      logger.warn(LOGGER_MESSAGES.LOGIN_BLOCKED.replace('{email}', dto.email));
      throw CustomException.unauthorized(RESPONSE_MESSAGES.USER_BLOCKED);
    }
    try {
      const deviceId = uuidv4();
      const tokens = await lastValueFrom(
        this.authService.getToken({
          email: user.email,
          deviceId: deviceId,
          role: user.role || 'user',
          entityId: user._id.toString(),
        }),
      );
      await this.userDao.updateUserActiveStatus(user._id.toString(), 'active');
      await this.userDao.updateUserDeviceId(user._id.toString(), deviceId);
      logger.info(LOGGER_MESSAGES.LOGIN_SUCCESS.replace('{email}', dto.email));
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
      logger.error(LOGGER_MESSAGES.LOGIN_TOKEN_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
    }
  }

  async handleGoogleLogin(googleUser: any) {
    try {
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
          role: user.role || 'user',
          entityId: user._id.toString(),
        }),
      );
      await this.userDao.updateUserDeviceId(user._id.toString(), deviceId);
      return {
        message: 'Google login successful',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          role: user.role,
          deviceId,
        },
        tokens,
      };
    } catch (error) {
      throw new InternalServerErrorException('Google login failed');
    }
  }

  async refreshTokens(
refreshToken: string,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    try {
      const response = await lastValueFrom(
        this.authService.accessToken({
          refreshToken,
        }),
      );
      return ResponseHelper.success('Token refreshed successfully', {
        accessToken: response.accessToken,
      });
    } catch (error) {
      logger.error(LOGGER_MESSAGES.TOKEN_REFRESH_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }
  }

  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    try {
      const response = await lastValueFrom(this.authService.validateToken({ accessToken: token }));
      console.log(response);
      return response;
    } catch (error) {
      logger.error(LOGGER_MESSAGES.TOKEN_VALIDATION_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.INVALID_TOKEN);
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    try{
      const user = await this.userDao.findUserById(userId);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_NOT_FOUND.replace('{userId}', userId));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }
    if (newPassword.length < 8) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_TOO_SHORT.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_TOO_SHORT);
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_INCORRECT.replace('{userId}', userId));
      throw CustomException.unauthorized(RESPONSE_MESSAGES.INCORRECT_OLD_PASSWORD);
    }
    if (oldPassword === newPassword) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_SAME_OLD.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_SAME_AS_OLD);
    }
    if (newPassword === user.password) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_SAME_CURRENT.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_SAME_AS_CURRENT);
    }
    if (newPassword.length < 8) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_CHANGE_SAME_CURRENT.replace('{userId}', userId));
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_TOO_SHORT);
    }
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS','10'));
    const hashed = await bcrypt.hash(newPassword,saltRounds );
    await this.userDao.updateUserPassword(userId, hashed);
    logger.info(LOGGER_MESSAGES.PASSWORD_CHANGED.replace('{userId}', userId));

    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_CHANGED_SUCCESS);
    }
    catch (error) {
      logger.error(LOGGER_MESSAGES.PASSWORD_CHANGE_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.PASSWORD_CHANGE_FAILED);
    }
  }

  async initiatePasswordReset(email: string): Promise<ApiResponse> {
    try{
      const user = await this.userDao.findUserByEmail(email);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_RESET_NOT_FOUND.replace('{email}', email));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    const otp = generateOTP();
    await Promise.all([
      this.redisService.set(`password-reset:${user._id}`, otp, 15 * 60),
      this.emailService.sendPasswordResetOTP(email, otp),
    ])

    logger.info(LOGGER_MESSAGES.PASSWORD_RESET_OTP_SENT.replace('{email}', email));
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_OTP_SENT);
    }
    catch(error) {
      logger.error(LOGGER_MESSAGES.PASSWORD_RESET_INIT_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.PASSWORD_RESET_FAILED);
    }
  }

  async verifyPasswordResetOTP(
    email: string,
    otp: string,
  ): Promise<ApiResponse<{ resetToken: string }>> {
    try{
      const user = await this.userDao.findUserByEmail(email);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.OTP_VERIFICATION_NOT_FOUND.replace('{email}', email));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }
    const storedOTP = await this.redisService.get(`password-reset:${user._id}`);
    if (storedOTP !== otp) {
      logger.warn(LOGGER_MESSAGES.OTP_VERIFICATION_FAILED.replace('{email}', email));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_OTP);
    }
    if(!storedOTP ){
      logger.warn(LOGGER_MESSAGES.OTP_VERIFICATION_EXPIRED.replace('{email}', email));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_OTP);
    }

    const resetToken = generateResetToken();
    await Promise.all([
      this.redisService.set(`reset-token:${user._id}`, resetToken, 10 * 60),
      this.redisService.del(`password-reset:${user._id}`),
    ]);

    logger.info(LOGGER_MESSAGES.OTP_VERIFIED.replace('{email}', email));
    return ResponseHelper.success(RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS, { resetToken });
    }
    catch (error) {
      logger.error(LOGGER_MESSAGES.OTP_VERIFICATION_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.OTP_VERIFICATION_FAILED);
    }
  }

  async resetPassword(
    email: string,
    newPassword: string,
    resetToken: string,
  ): Promise<ApiResponse> {
    try{
      const user = await this.userDao.findUserByEmail(email);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_RESET_FAILED_NOT_FOUND.replace('{email}', email));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }
    const storedResetToken = await this.redisService.get(`reset-token:${user._id}`);
    if ( storedResetToken !== resetToken) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_RESET_INVALID_TOKEN.replace('{email}', email));
      throw new BadRequestException(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }
    if(!storedResetToken){
      logger.warn(LOGGER_MESSAGES.PASSWORD_RESET_TOKEN_EXPIRED.replace('{email}', email));
      throw CustomException.badRequest(RESPONSE_MESSAGES.INVALID_RESET_TOKEN);
    }
    if (newPassword.length < 8) {
      logger.warn(LOGGER_MESSAGES.PASSWORD_RESET_TOO_SHORT.replace('{email}', email));
      throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_TOO_SHORT);
    }
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS','10'));

    const hashed = await bcrypt.hash(newPassword, saltRounds );
    await this.userModel.findByIdAndUpdate(user._id, { password: hashed });
    await this.redisService.del(`reset-token:${user._id}`);

    logger.info(LOGGER_MESSAGES.PASSWORD_RESET_COMPLETED.replace('{email}', email));
    return ResponseHelper.success(RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS);
    }
    catch (error) {
      logger.error(LOGGER_MESSAGES.PASSWORD_RESET_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.PASSWORD_RESET_FAILED);
    }
  }

async addAddress(
  userId: string,
  dto: CreateAddressDto,
): Promise<ApiResponse<{ addresses: UserDocument['addresses'] }>> {
  try{
  const user = await this.userDao.findUserById(userId);
  if (!user) {
    logger.warn(LOGGER_MESSAGES.ADD_ADDRESS_NOT_FOUND.replace('{userId}', userId));
    throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND); 
  }
  if (dto.isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push(dto);
  await user.save();

  logger.info(LOGGER_MESSAGES.ADD_ADDRESS_SUCCESS.replace('{userId}', userId));
  return ResponseHelper.created(RESPONSE_MESSAGES.ADDRESS_ADDED_SUCCESS, {
    addresses: user.addresses,
  });
}
catch (error) {
  logger.error(LOGGER_MESSAGES.ADD_ADDRESS_ERROR.replace('{error}', error.message));
  throw CustomException.internalServererror(RESPONSE_MESSAGES.ADDRESS_CREATION_FAILED);
}     
}

async getUserAddresses(userId: string): Promise<ApiResponse<UserDocument['addresses']>> {
  try{
  const user= await this.userDao.findUserById(userId);
  if (!user) {   
    logger.warn(LOGGER_MESSAGES.GET_ADDRESS_NOT_FOUND.replace('{userId}', userId));
    throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  logger.info(LOGGER_MESSAGES.GET_ADDRESS_SUCCESS.replace('{userId}', userId));
  return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESSES_RETRIEVED_SUCCESS, user.addresses);
}
catch (error) {
  logger.error(LOGGER_MESSAGES.GET_ADDRESS_ERROR.replace('{error}', error.message));    
  throw CustomException.internalServererror(RESPONSE_MESSAGES.ADDRESSES_RETRIEVAL_FAILED);
}
}

async updateAddress(
  userId: string,
  addressId: string,
  dto: UpdateAddressDto,
): Promise<ApiResponse<{ address: UserDocument['addresses'][number] }>> {
  try {
    const user = await this.userDao.findUserById(userId);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND.replace('{userId}', userId));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }
    if (dto.isDefault) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    const updateResult = await this.userModel.updateOne(
      { _id: userId, 'addresses._id': addressId },
      {
        $set: Object.fromEntries(
          Object.entries(dto).map(([key, value]) => [`addresses.$.${key}`, value])
        ),
      }
    );

    if (updateResult.modifiedCount === 0) {
      logger.warn(LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_ADDRESS.replace('{addressId}', addressId));
      throw CustomException.notFound(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }
    const updatedUser = await this.userDao.findUserById(userId);
    if (!updatedUser) {
      logger.warn(LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_AFTER.replace('{userId}', userId));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }
    const updatedAddress = updatedUser.addresses.find((addr) => addr._id?.toString() === addressId);

    if (!updatedAddress) {
      logger.warn(LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_ADDRESS_AFTER.replace('{addressId}', addressId));
      throw CustomException.notFound(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    logger.info( LOGGER_MESSAGES.UPDATE_ADDRESS_SUCCESS.replace('{userId}', userId).replace('{addressId}', addressId),);
    return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_UPDATED_SUCCESS, {
      address: updatedAddress,
    });
  } catch (error) {
    logger.error(LOGGER_MESSAGES.UPDATE_ADDRESS_ERROR.replace('{error}', error.message));
    throw CustomException.internalServererror(RESPONSE_MESSAGES.ADDRESSES_RETRIEVAL_FAILED);
  }
}

async deleteAddress(userId: string, addressId: string): Promise<ApiResponse<null>> {
  try{
    const user = await this.userDao.findUserById(userId);
  if (!user) {
   logger.warn(LOGGER_MESSAGES.DELETE_ADDRESS_NOT_FOUND.replace('{userId}', userId));
    throw new NotFoundException(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  const addressIndex = user.addresses.findIndex((addr) => addr._id?.toString() === addressId);
  if (addressIndex === -1) {
    logger.warn(LOGGER_MESSAGES.DELETE_ADDRESS_NOT_FOUND_ADDRESS.replace('{addressId}', addressId));
    throw new NotFoundException(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
  }

  user.addresses.splice(addressIndex, 1);
  await user.save();

  logger.info(LOGGER_MESSAGES.DELETE_ADDRESS_SUCCESS.replace('{userId}', userId).replace('{addressId}', addressId),);
  return ResponseHelper.success(RESPONSE_MESSAGES.ADDRESS_DELETED_SUCCESS, null);
  }
  catch(error){
    logger.error(LOGGER_MESSAGES.DELETE_ADDRESS_ERROR.replace('{error}', error.message));
    throw CustomException.internalServererror(RESPONSE_MESSAGES.ADDRESS_DELETED_FAILED)
  }
}

  async getProfile(userId: string): Promise<ApiResponse<UserDocument>> {
    try{
      const user = await this.userDao.findUserByIdWithoutPassword(userId);
    if (!user) {
      logger.warn(LOGGER_MESSAGES.GET_PROFILE_NOT_FOUND.replace('{userId}', userId));
      throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
    }

    logger.info(LOGGER_MESSAGES.GET_PROFILE_SUCCESS.replace('{userId}', userId));
    return ResponseHelper.success(RESPONSE_MESSAGES.PROFILE_RETRIEVED_SUCCESS, user);
    }
    catch(error){
      throw CustomException.internalServererror(RESPONSE_MESSAGES.PROFILE_RETRIEVED_FAILED)
    }
  }

async editProfile(
  userId: string,
  updateData: { name?: string; phoneNumber?: string }
): Promise<ApiResponse<UserDocument>> {
  try{
    const updatedUser = await this.userDao.findByIdAndUpdateWithoutPassword(
    userId,
    updateData
  );

  if (!updatedUser) {
    logger.warn(LOGGER_MESSAGES.EDIT_PROFILE_NOT_FOUND.replace('{userId}', userId));
    throw CustomException.notFound(RESPONSE_MESSAGES.USER_NOT_FOUND);
  }

  logger.info(LOGGER_MESSAGES.EDIT_PROFILE_SUCCESS.replace('{userId}', userId));
  return ResponseHelper.success(RESPONSE_MESSAGES.PROFILE_UPDATED_SUCCESS, updatedUser);
  }
  catch(error){
    throw CustomException.internalServererror(RESPONSE_MESSAGES.PROFILE_UPDATED_FAILED)
  }
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
    
   logger.info(LOGGER_MESSAGES.LOGOUT_SUCCESS.replace('{token}', accessToken.substring(0, 10) + '...'), );
    return ResponseHelper.success(RESPONSE_MESSAGES.LOGOUT_SUCCESS, {
      success: result.success,
    });
  } catch (error) {
    logger.error(
        LOGGER_MESSAGES.LOGOUT_ERROR.replace('{error}', error.message).replace(
          '{token}',
          accessToken.substring(0, 10) + '...',
        ),
      );
    throw CustomException.internalServererror(RESPONSE_MESSAGES.LOGOUT_FAILED);
  }
}

}
