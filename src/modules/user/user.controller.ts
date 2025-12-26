import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Patch,
  HttpCode,
  Put,
  Param,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { PasswordResetInitDto } from './dto/ password-reset-init.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { UpdateAddressDto } from './dto/update-address.dto';
import { HTTP_STATUS } from '../../common/constants/http-status';
import { RESPONSE_MESSAGES } from '../../common/constants/user-messages';
import { GoogleOAuthGuard } from '../../middleware/google-oauth.guard';
import { AuthGuard } from '../../middleware/auth.guard';
import { CustomException } from '../../common/exceptions/user.exceptions';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LOGGER_MESSAGES } from '../../common/constants/logger.constants';
import { getUserIdFromRequest, getAccessTokenFromRequest } from '../../utils/controller.helper';
import { logMessage } from '../../utils/logger.utils';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HTTP_STATUS.CREATED,
    description: RESPONSE_MESSAGES.USER_REGISTERED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.CONFLICT,
    description: RESPONSE_MESSAGES.EMAIL_ALREADY_EXISTS,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.SIGNUP_FAILED,
  })
  async signup(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    logMessage('info', LOGGER_MESSAGES.SIGNUP_ATTEMPT, { email: createUserDto.email });
    const result = await this.userService.signup(createUserDto);
    logMessage('info', LOGGER_MESSAGES.SIGNUP_SUCCESS, { email: createUserDto.email });
    return result;
  }

  @Post('verify-email')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.EMAIL_VERIFIED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.INVALID_VERIFICATION_TOKEN,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.EMAIL_VERIFICATION_FAILED,
  })
  async verifyEmail(@Body(ValidationPipe) verifyEmailDto: VerifyEmailDto) {
    logMessage('info', LOGGER_MESSAGES.EMAIL_VERIFICATION_ATTEMPT, {
      userId: verifyEmailDto.userId,
    });
    const result = await this.userService.verifyEmail(verifyEmailDto.userId, verifyEmailDto.token);
    logMessage('info', LOGGER_MESSAGES.EMAIL_VERIFICATION_SUCCESS, {
      userId: verifyEmailDto.userId,
    });
    return result;
  }

  @Post('login')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  async login(@Body(ValidationPipe) loginUserDto: LoginUserDto) {
    logMessage('info', LOGGER_MESSAGES.LOGIN_ATTEMPT, { email: loginUserDto.email });
    const result = await this.userService.login(loginUserDto);
    logMessage('info', LOGGER_MESSAGES.LOGIN_SUCCESS, { email: loginUserDto.email });
    return result;
  }

  @Get('google/login')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google login functionality' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: 'Failed to initiate Google login',
  })
  async googleLogin() {
    logMessage('info', LOGGER_MESSAGES.GOOGLE_LOGIN_INITIATED);
    return { message: 'Google login initiated' };
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google login' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: 'Google authentication failed',
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: 'Google login failed',
  })
  async googleLoginRedirect(@Request() req: any) {
    logMessage('info', LOGGER_MESSAGES.GOOGLE_LOGIN_REDIRECT, {
      email: req.user?.email || 'unknown',
    });
    if (!req.user) {
      throw CustomException.unauthorized('Google authentication failed');
    }
    const result = await this.userService.handleGoogleLogin(req.user);
    logMessage('info', LOGGER_MESSAGES.GOOGLE_LOGIN_SUCCESS, {
      email: req.user?.email || 'unknown',
    });
    return result;
  }

  @Post('forgot-password')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_OTP_SENT,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.FILL_EMAIL,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async initiatePasswordReset(@Body(ValidationPipe) dto: PasswordResetInitDto) {
    logMessage('info', LOGGER_MESSAGES.PPWORD_RESET_INITIATED, { email: dto.email });
    const result = await this.userService.initiatePasswordReset(dto.email);
    logMessage('info', LOGGER_MESSAGES.PASSWORD_RESET_OTP_SENT, { email: dto.email });
    return result;
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Verify password reset OTP' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.INVALID_OTP,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.OTP_VERIFICATION_FAILED,
  })
  async verifyPasswordResetOTP(@Body(ValidationPipe) dto: VerifyOtpDto) {
    logMessage('info', LOGGER_MESSAGES.OTP_VERIFICATION_ATTEMPT, { email: dto.email });
    const result = await this.userService.verifyPasswordResetOTP(dto.email, dto.otp);
    logMessage('info', LOGGER_MESSAGES.OTP_VERIFICATION_SUCCESS, { email: dto.email });
    return result;
  }

  @Post('forgot-password/reset')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_TOKEN_REQUIRED,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_FAILED,
  })
  async resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
    logMessage('info', LOGGER_MESSAGES.PASSWORD_RESET_ATTEMPT, { email: dto.email });
    const result = await this.userService.resetPassword(dto.email, dto.newPassword, dto.resetToken);
    logMessage('info', LOGGER_MESSAGES.PASSWORD_RESET_SUCCESS, { email: dto.email });
    return result;
  }

  @UseGuards(AuthGuard)
  @Patch('change-password')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_CHANGED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.PASSWORD_TOO_SHORT,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.PASSWORD_CHANGE_FAILED,
  })
  async changePassword(
    @Request() req: any,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ) {
    const userId: string = getUserIdFromRequest(req);
    logMessage('info', LOGGER_MESSAGES.PASSWORD_CHANGE_ATTEMPT, { userId });
    const result = await this.userService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    logMessage('info', LOGGER_MESSAGES.PASSWORD_CHANGE_SUCCESS, { userId });
    return result;
  }

  @Post('refresh-token')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_RESET_TOKEN,
  })
  async refreshToken(@Body(ValidationPipe) refreshTokenDto: RefreshTokenDto) {
    logMessage('info', LOGGER_MESSAGES.TOKEN_REFRESH_ATTEMPT, { userId: 'unknown' });
    const result = await this.userService.refreshTokens(refreshTokenDto.refreshToken);
    logMessage('info', LOGGER_MESSAGES.TOKEN_REFRESH_SUCCESS, { userId: 'unknown' });
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('address')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add address (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.CREATED,
    description: RESPONSE_MESSAGES.ADDRESS_ADDED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.ADDRESS_CREATION_FAILED,
  })
  async addAddress(@Request() req: any, @Body(ValidationPipe) createAddressDto: CreateAddressDto) {
    const userId: string = getUserIdFromRequest(req);
    logMessage('info', LOGGER_MESSAGES.ADD_ADDRESS_ATTEMPT, { userId });
    const result = await this.userService.addAddress(userId, createAddressDto);
    logMessage('info', LOGGER_MESSAGES.ADD_ADDRESS_SUCCESS, { userId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('addresses')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user addresses (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESSES_RETRIEVED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.ADDRESSES_RETRIEVAL_FAILED,
  })
  async getUserAddresses(@Request() req: any) {
    const userId: string = getUserIdFromRequest(req);
    logMessage('info', LOGGER_MESSAGES.GET_ADDRESS_ATTEMPT, { userId });
    const result = await this.userService.getUserAddresses(userId);
    logMessage('info', LOGGER_MESSAGES.GET_ADDRESS_SUCCESS, { userId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Put('address/:addressId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update address by ID (authenticated)' })
  @ApiParam({ name: 'addressId', required: true, description: 'The ID of the address to update' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESS_UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: 'Address ID is required',
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.ADDRESS_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.ADDRESSES_RETRIEVAL_FAILED,
  })
  async updateAddress(
    @Request() req: any,
    @Param('addressId') addressId: string,
    @Body(ValidationPipe) updateAddressDto: UpdateAddressDto,
  ) {
    const userId: string = getUserIdFromRequest(req);
    if (!addressId) {
      logMessage('warn', LOGGER_MESSAGES.UPDATE_ADDRESS_NOT_FOUND_ADDRESS, { addressId });
      throw CustomException.badRequest('Address ID is required');
    }
    logMessage('info', LOGGER_MESSAGES.UPDATE_ADDRESS_ATTEMPT, { userId, addressId });
    const result = await this.userService.updateAddress(userId, addressId, updateAddressDto);
    logMessage('info', LOGGER_MESSAGES.UPDATE_ADDRESS_SUCCESS, { userId, addressId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Delete('address/:addressId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete address by ID (authenticated)' })
  @ApiParam({ name: 'addressId', required: true, description: 'The ID of the address to delete' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESS_DELETED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.BAD_REQUEST,
    description: RESPONSE_MESSAGES.ADDRESS_ID,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.ADDRESS_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.ADDRESS_DELETED_FAILED,
  })
  async deleteAddress(@Request() req: any, @Param('addressId') addressId: string) {
    const userId: string = getUserIdFromRequest(req);
    if (!addressId) {
      logMessage('warn', LOGGER_MESSAGES.DELETE_ADDRESS_NOT_FOUND_ADDRESS, { addressId });
      throw CustomException.badRequest('Address ID is required');
    }
    logMessage('info', LOGGER_MESSAGES.DELETE_ADDRESS_ATTEMPT, { userId, addressId });
    const result = await this.userService.deleteAddress(userId, addressId);
    logMessage('info', LOGGER_MESSAGES.DELETE_ADDRESS_SUCCESS, { userId, addressId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user profile (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PROFILE_RETRIEVED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async getProfile(@Request() req: any) {
    const userId: string = getUserIdFromRequest(req);
    logMessage('info', LOGGER_MESSAGES.GET_PROFILE_ATTEMPT, { userId });
    const result = await this.userService.getProfile(userId);
    logMessage('info', LOGGER_MESSAGES.GET_PROFILE_SUCCESS, { userId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Patch('edit-profile')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Edit user profile (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PROFILE_UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.authentication_required,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async editProfile(@Request() req: any, @Body(ValidationPipe) updateUserDto: UpdateProfileDto) {
    const userId: string = getUserIdFromRequest(req);
    logMessage('info', LOGGER_MESSAGES.EDIT_PROFILE_ATTEMPT, { userId });
    const result = await this.userService.editProfile(userId, updateUserDto);
    logMessage('info', LOGGER_MESSAGES.EDIT_PROFILE_SUCCESS, { userId });
    return result;
  }

  @UseGuards(AuthGuard)
  @Delete('logout')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGOUT_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.ACCESS_TOKEN_REQUIRED,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.LOGOUT_FAILED,
  })
  async logout(@Request() req: any) {
    // console.log("dejhbsadbhj");
    const accessToken: string = getAccessTokenFromRequest(req);
    // console.log("dghgcdu");
    const userId: string = req.user?.userId;
    logMessage('info', LOGGER_MESSAGES.LOGOUT_ATTEMPT, { userId });
    const result = await this.userService.logout(accessToken);
    logMessage('info', LOGGER_MESSAGES.LOGOUT_SUCCESS, { userId });
    return result;
  }
}
