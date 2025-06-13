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
  Req,
  Inject,
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

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(AuthGuard) private readonly authGuard: AuthGuard,
  ) {}

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
  async signup(@Body() createUserDto: CreateUserDto) {
    try {
      logger.info(`Signup attempt for email: ${createUserDto.email}`);
      const result = await this.userService.signup(createUserDto);
      logger.info(`Signup successful for email: ${createUserDto.email}`);
      return result;
    } catch (error) {
      logger.error(`Signup failed for email: ${createUserDto.email} - ${error.message}`);
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
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    try {
      if (!verifyEmailDto.userId || !verifyEmailDto.token) {
        throw CustomException.badRequest(RESPONSE_MESSAGES.DATA_REQIRED);
      }
      
      logger.info(`Email verification attempt for user: ${verifyEmailDto.userId}`);
      const result = await this.userService.verifyEmail(verifyEmailDto.userId, verifyEmailDto.token);
      logger.info(`Email verification successful for user: ${verifyEmailDto.userId}`);
      return result;
    } catch (error) {
      logger.error(`Email verification failed for user: ${verifyEmailDto.userId} - ${error.message}`);
      throw error;
    }
  }

  @Post('resend-verification')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.VERIFICATION_EMAIL_SENT,
  })
  async resendVerification(@Body('email') email: string) {
    try {
      if (!email) {
        throw CustomException.badRequest(RESPONSE_MESSAGES.FILL_EMAIL);
      }
      
      logger.info(`Resend verification attempt for email: ${email}`);
      const result = await this.userService.resendVerificationEmail(email);
      logger.info(`Resend verification successful for email: ${email}`);
      return result;
    } catch (error) {
      logger.error(`Resend verification failed for email: ${email} - ${error.message}`);
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    //type: LoginResponseDto,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  async login(@Body() loginUserDto: LoginUserDto) {
    try {
      logger.info(`Login attempt for email: ${loginUserDto.email}`);
      const result = await this.userService.login(loginUserDto);
      logger.info(`Login successful for email: ${loginUserDto.email}`);
      return result;
    } catch (error) {
      logger.error(`Login failed for email: ${loginUserDto.email} - ${error.message}`);
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
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async googleLogin() {
    try {
      logger.info('Google login initiated');
    } catch (error) {
      logger.error(`Google login initiation failed - ${error.message}`);
      throw CustomException.internalServererror('Failed to initiate Google login');
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
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async googleLoginRedirect(@Req() req) {
    try {
      if (!req.user) {
        throw CustomException.unauthorized('Google authentication failed');
      }
      
      logger.info(`Google login redirect for user: ${req.user.email}`);
      const result = await this.userService.handleGoogleLogin(req.user);
      logger.info(`Google login successful for user: ${req.user.email}`);
      return result;
    } catch (error) {
      logger.error(`Google login redirect failed - ${error.message}`);
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
  async initiatePasswordReset(@Body() dto: PasswordResetInitDto) {
    try {
      if (!dto.email) {
        throw CustomException.badRequest('Email is required');
      }
      
      logger.info(`Password reset initiation for email: ${dto.email}`);
      const result = await this.userService.initiatePasswordReset(dto.email);
      logger.info(`Password reset OTP sent for email: ${dto.email}`);
      return result;
    } catch (error) {
      logger.error(`Password reset initiation failed for email: ${dto.email} - ${error.message}`);
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
  async verifyPasswordResetOTP(@Body() dto: VerifyOtpDto) {
    try {
      if (!dto.email || !dto.otp) {
        throw CustomException.badRequest(RESPONSE_MESSAGES.EMAIL_OTP_REQUIRE);
      }
      
      logger.info(`OTP verification attempt for email: ${dto.email}`);
      const result = await this.userService.verifyPasswordResetOTP(dto.email, dto.otp);
      logger.info(`OTP verification successful for email: ${dto.email}`);
      return result;
    } catch (error) {
      logger.error(`OTP verification failed for email: ${dto.email} - ${error.message}`);
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
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      if (!dto.email || !dto.newPassword || !dto.resetToken) {
        throw CustomException.badRequest(RESPONSE_MESSAGES.PASSWORD_RESET_TOKEN_REQUIRED);
      }
      
      logger.info(`Password reset attempt for email: ${dto.email}`);
      const result = await this.userService.resetPassword(dto.email, dto.newPassword, dto.resetToken);
      logger.info(`Password reset successful for email: ${dto.email}`);
      return result;
    } catch (error) {
      logger.error(`Password reset failed for email: ${dto.email} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Patch('change-password')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_CHANGED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      
      if (!changePasswordDto.newPassword) {
        throw CustomException.badRequest('New password is required');
      }
      
      logger.info(`Password change attempt for user: ${req.user.userId}`);
      const result = await this.userService.changePassword(req.user.userId, changePasswordDto.oldPassword,changePasswordDto.newPassword);
      logger.info(`Password change successful for user: ${req.user.userId}`);
      return result;
    } catch (error) {
      logger.error(`Password change failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  // @UseGuards(AuthGuard)
  @Post('refresh-token')
  @HttpCode(HTTP_STATUS.OK)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_RESET_TOKEN,
  })
  async refreshToken(@Request() req, @Body() body: { refreshToken: string }) {
    try {
      if (!body.refreshToken) {
        throw CustomException.badRequest(RESPONSE_MESSAGES.REFRESH_TOKEN_REQUIRE);
      }
      
      logger.info(`Token refresh attempt for user: ${req.user?.userId}`);
      const result = await this.userService.refreshTokens(body.refreshToken);
      logger.info(`Token refresh successful for user: ${req.user?.userId}`);
      return result;
    } catch (error) {
      logger.error(`Token refresh failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Post('address')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add address (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.CREATED,
    description: RESPONSE_MESSAGES.ADDRESS_ADDED_SUCCESS,
  })
  async addAddress(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      
      logger.info(`Add address attempt for user: ${req.user.userId}`);
      const result = await this.userService.addAddress(req.user.userId, createAddressDto);
      logger.info(`Add address successful for user: ${req.user.userId}`);
      return result;
    } catch (error) {
      logger.error(`Add address failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Get('addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user addresses (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESSES_RETRIEVED_SUCCESS,
  })
  async getUserAddresses(@Request() req) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      
      logger.info(`Get addresses attempt for user: ${req.user.userId}`);
      const result = await this.userService.getUserAddresses(req.user.userId);
      logger.info(`Get addresses successful for user: ${req.user.userId}`);
      return result;
    } catch (error) {
      logger.error(`Get addresses failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Put('address/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address by ID (authenticated)' })
  @ApiParam({ name: 'addressId', required: true, description: 'The ID of the address to update' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESS_UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.ADDRESS_NOT_FOUND,
  })
  async updateAddress(
    @Request() req,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      
      if (!addressId) {
        throw CustomException.badRequest('Address ID is required');
      }
      
      logger.info(`Update address attempt for user: ${req.user.userId}, address: ${addressId}`);
      const result = await this.userService.updateAddress(req.user.userId, addressId, updateAddressDto);
      logger.info(`Update address successful for user: ${req.user.userId}, address: ${addressId}`);
      return result;
    } catch (error) {
      logger.error(`Update address failed for user: ${req.user?.userId}, address: ${addressId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Delete('address/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete address by ID (authenticated)' })
  @ApiParam({ name: 'addressId', required: true, description: 'The ID of the address to delete' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.ADDRESS_DELETED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.ADDRESS_NOT_FOUND,
  })
  async deleteAddress(@Request() req, @Param('addressId') addressId: string) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      
      if (!addressId) {
        throw CustomException.badRequest('Address ID is required');
      }
      
      logger.info(`Delete address attempt for user: ${req.user.userId}, address: ${addressId}`);
      const result = await this.userService.deleteAddress(req.user.userId, addressId);
      logger.info(`Delete address successful for user: ${req.user.userId}, address: ${addressId}`);
      return result;
    } catch (error) {
      logger.error(`Delete address failed for user: ${req.user?.userId}, address: ${addressId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PROFILE_RETRIEVED_SUCCESS,
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
      
      logger.info(`Get profile attempt for user: ${req.user.userId}`);
      const result = await this.userService.getProfile(req.user.userId);
      logger.info(`Get profile successful for user: ${req.user.userId}`);
      return result;
    } catch (error) {
      logger.error(`Get profile failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Patch('edit-profile')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit user profile (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PROFILE_UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async editProfile(@Request() req, @Body() updateUserDto: UpdateProfileDto) {
    try {
      if (!req.user?.userId) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.authentication_required);
      }
      logger.info(`Edit profile attempt for user: ${req.user.userId}`);
      const result = await this.userService.editProfile(req.user.userId, updateUserDto);
      logger.info(`Edit profile successful for user: ${req.user.userId}`);
      return result;
    } catch (error) {
      logger.error(`Edit profile failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout (authenticated)' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGOUT_SUCCESS,
  })
  async logout(@Request() req) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '');
      
      if (!accessToken) {
        throw CustomException.unauthorized(RESPONSE_MESSAGES.ACCESS_TOKEN_REQUIRED);
      }
      
      logger.info(`Logout attempt for user: ${req.user?.userId}`);
      const result = await this.userService.logout(accessToken);
      logger.info(`Logout successful for user: ${req.user?.userId}`);
      return result;
    } catch (error) {
      logger.error(`Logout failed for user: ${req.user?.userId} - ${error.message}`);
      throw error;
    }
  }
}