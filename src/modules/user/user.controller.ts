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
import { logger } from '../../common/logger';
import { CustomException } from '../../common/exceptions/user.exceptions';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LOGGER_MESSAGES } from '../../common/constants/logger.constants';

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
    try {
      logger.info(LOGGER_MESSAGES.SIGNUP_ATTEMPT.replace('{email}', createUserDto.email));
      const result = await this.userService.signup(createUserDto);
      logger.info(LOGGER_MESSAGES.SIGNUP_SUCCESS.replace('{email}', createUserDto.email));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.SIGNUP_ERROR.replace('{error}', error.message).replace('{email}', createUserDto.email),
      );
      throw error;
    }
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
    try {
      logger.info(LOGGER_MESSAGES.EMAIL_VERIFICATION_ATTEMPT.replace('{userId}', verifyEmailDto.userId));
      const result = await this.userService.verifyEmail(verifyEmailDto.userId, verifyEmailDto.token);
      logger.info(LOGGER_MESSAGES.EMAIL_VERIFICATION_SUCCESS.replace('{userId}', verifyEmailDto.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.EMAIL_VERIFICATION_ERROR.replace('{error}', error.message).replace(
          '{userId}',
          verifyEmailDto.userId,
        ),
      );
      throw error;
    }
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
    try {
      logger.info(LOGGER_MESSAGES.LOGIN_ATTEMPT.replace('{email}', loginUserDto.email));
      const result = await this.userService.login(loginUserDto);
      logger.info(LOGGER_MESSAGES.LOGIN_SUCCESS.replace('{email}', loginUserDto.email));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.LOGIN_ERROR.replace('{error}', error.message).replace('{email}', loginUserDto.email),
      );
      throw error;
    }
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
    try {
      logger.info(LOGGER_MESSAGES.GOOGLE_LOGIN_INITIATED);
    } catch (error) {
      logger.error(LOGGER_MESSAGES.GOOGLE_LOGIN_INIT_ERROR.replace('{error}', error.message));
      throw CustomException.internalServererror(RESPONSE_MESSAGES.LOGIN_FAILED);
    }
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
  async googleLoginRedirect(@Request() req) {
    try {
      if (!req.user) {
        throw CustomException.unauthorized('Google authentication failed');
      }
      logger.info(LOGGER_MESSAGES.GOOGLE_LOGIN_REDIRECT.replace('{email}', req.user.email));
      const result = await this.userService.handleGoogleLogin(req.user);
      logger.info(LOGGER_MESSAGES.GOOGLE_LOGIN_SUCCESS.replace('{email}', req.user.email));
      return result;
    } catch (error) {
      logger.error(LOGGER_MESSAGES.GOOGLE_LOGIN_REDIRECT_ERROR.replace('{error}', error.message));
      throw error;
    }
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
    description: 'Email is required',
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_FAILED,
  })
  async initiatePasswordReset(@Body(ValidationPipe) dto: PasswordResetInitDto) {
    try {
      logger.info(LOGGER_MESSAGES.PASSWORD_RESET_INITIATED.replace('{email}', dto.email));
      const result = await this.userService.initiatePasswordReset(dto.email);
      logger.info(LOGGER_MESSAGES.PASSWORD_RESET_OTP_SENT.replace('{email}', dto.email));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.PASSWORD_RESET_INIT_ERROR.replace('{error}', error.message).replace('{email}', dto.email),
      );
      throw error;
    }
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
    try {
      logger.info(LOGGER_MESSAGES.OTP_VERIFICATION_ATTEMPT.replace('{email}', dto.email));
      const result = await this.userService.verifyPasswordResetOTP(dto.email, dto.otp);
      logger.info(LOGGER_MESSAGES.OTP_VERIFICATION_SUCCESS.replace('{email}', dto.email));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.OTP_VERIFICATION_ERROR.replace('{error}', error.message).replace('{email}', dto.email),
      );
      throw error;
    }
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
    try {
      logger.info(LOGGER_MESSAGES.PASSWORD_RESET_ATTEMPT.replace('{email}', dto.email));
      const result = await this.userService.resetPassword(dto.email, dto.newPassword, dto.resetToken);
      logger.info(LOGGER_MESSAGES.PASSWORD_RESET_SUCCESS.replace('{email}', dto.email));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.PASSWORD_RESET_ERROR.replace('{error}', error.message).replace('{email}', dto.email),
      );
      throw error;
    }
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
  async changePassword(@Request() req, @Body(ValidationPipe) changePasswordDto: ChangePasswordDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(LOGGER_MESSAGES.PASSWORD_CHANGE_ATTEMPT.replace('{userId}', req.user.userId));
      const result = await this.userService.changePassword(
        req.user.userId,
        changePasswordDto.oldPassword,
        changePasswordDto.newPassword,
      );
      logger.info(LOGGER_MESSAGES.PASSWORD_CHANGE_SUCCESS.replace('{userId}', req.user.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.PASSWORD_CHANGE_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
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
    try {
      const result = await this.userService.refreshTokens(refreshTokenDto.refreshToken);
      logger.info(LOGGER_MESSAGES.TOKEN_REFRESH_SUCCESS.replace('{userId}', 'unknown')); 
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.TOKEN_REFRESH_ERROR.replace('{error}', error.message).replace('{userId}', 'unknown'),
      );
      throw error;
    }
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
  async addAddress(@Request() req, @Body(ValidationPipe) createAddressDto: CreateAddressDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(LOGGER_MESSAGES.ADD_ADDRESS_ATTEMPT.replace('{userId}', req.user.userId));
      const result = await this.userService.addAddress(req.user.userId, createAddressDto);
      logger.info(LOGGER_MESSAGES.ADD_ADDRESS_SUCCESS.replace('{userId}', req.user.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.ADD_ADDRESS_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
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
  async getUserAddresses(@Request() req) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(LOGGER_MESSAGES.GET_ADDRESS_ATTEMPT.replace('{userId}', req.user.userId));
      const result = await this.userService.getUserAddresses(req.user.userId);
      logger.info(LOGGER_MESSAGES.GET_ADDRESS_SUCCESS.replace('{userId}', req.user.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.GET_ADDRESS_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
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
    @Request() req,
    @Param('addressId') addressId: string,
    @Body(ValidationPipe) updateAddressDto: UpdateAddressDto,
  ) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      if (!addressId) {
        throw CustomException.badRequest('Address ID is required');
      }
      logger.info(
        LOGGER_MESSAGES.UPDATE_ADDRESS_ATTEMPT.replace('{userId}', req.user.userId).replace('{addressId}', addressId),
      );
      const result = await this.userService.updateAddress(req.user.userId, addressId, updateAddressDto);
      logger.info(
        LOGGER_MESSAGES.UPDATE_ADDRESS_SUCCESS.replace('{userId}', req.user.userId).replace('{addressId}', addressId),
      );
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.UPDATE_ADDRESS_ERROR.replace('{error}', error.message)
          .replace('{userId}', req.user?.userId || 'unknown')
          .replace('{addressId}', addressId),
      );
      throw error;
    }
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
    description: RESPONSE_MESSAGES.ADDRESS_DELETED_FAILED,
  })
  async deleteAddress(@Request() req, @Param('addressId') addressId: string) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      if (!addressId) {
        throw CustomException.badRequest('Address ID is required');
      }
      logger.info(
        LOGGER_MESSAGES.DELETE_ADDRESS_ATTEMPT.replace('{userId}', req.user.userId).replace('{addressId}', addressId),
      );
      const result = await this.userService.deleteAddress(req.user.userId, addressId);
      logger.info(
        LOGGER_MESSAGES.DELETE_ADDRESS_SUCCESS.replace('{userId}', req.user.userId).replace('{addressId}', addressId),
      );
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.DELETE_ADDRESS_ERROR.replace('{error}', error.message)
          .replace('{userId}', req.user?.userId || 'unknown')
          .replace('{addressId}', addressId),
      );
      throw error;
    }
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
  async getProfile(@Request() req) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(LOGGER_MESSAGES.GET_PROFILE_ATTEMPT.replace('{userId}', req.user.userId));
      const result = await this.userService.getProfile(req.user.userId);
      logger.info(LOGGER_MESSAGES.GET_PROFILE_SUCCESS.replace('{userId}', req.user.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.GET_PROFILE_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
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
  async editProfile(@Request() req, @Body(ValidationPipe) updateUserDto: UpdateProfileDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(LOGGER_MESSAGES.EDIT_PROFILE_ATTEMPT.replace('{userId}', req.user.userId));
      const result = await this.userService.editProfile(req.user.userId, updateUserDto);
      logger.info(LOGGER_MESSAGES.EDIT_PROFILE_SUCCESS.replace('{userId}', req.user.userId));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.EDIT_PROFILE_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
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
  async logout(@Request() req) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '');
      if (!accessToken) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.ACCESS_TOKEN_REQUIRED);
      }
      logger.info(LOGGER_MESSAGES.LOGOUT_ATTEMPT.replace('{userId}', req.user?.userId || 'unknown'));
      const result = await this.userService.logout(accessToken);
      logger.info(LOGGER_MESSAGES.LOGOUT_SUCCESS.replace('{userId}', req.user?.userId || 'unknown'));
      return result;
    } catch (error) {
      logger.error(
        LOGGER_MESSAGES.LOGOUT_ERROR.replace('{error}', error.message).replace('{userId}', req.user?.userId || 'unknown'),
      );
      throw error;
    }
  }
}