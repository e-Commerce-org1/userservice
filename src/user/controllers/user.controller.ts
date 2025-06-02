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
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { CreateAddressDto } from '../dto/create-address.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { PasswordResetInitDto } from '../dto/ password-reset-init.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
//import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { LoginResponseDto } from '../dto/login-response.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';
import { HTTP_STATUS } from '../common/http-status';
import { RESPONSE_MESSAGES } from '../common/user-messages';
import { GoogleOAuthGuard } from '../middleware/google-oauth.guard';
import { AuthGuard } from '../middleware/auth.guard';

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
    return await this.userService.signup(createUserDto);
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
    return await this.userService.verifyEmail(verifyEmailDto.userId, verifyEmailDto.token);
  }

  @Post('resend-verification')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.VERIFICATION_EMAIL_SENT,
  })
  async resendVerification(@Body('email') email: string) {
    return await this.userService.resendVerificationEmail(email);
  }

  @Post('login')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    type: LoginResponseDto,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  })
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.userService.login(loginUserDto);
  }

  @Get('google/login')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'google login functionality' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async googleLogin() {
    // Guard redirects to Google; this method intentionally left blank
  }

  // Google OAuth callback endpoint
  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'redirect to google login' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.LOGIN_SUCCESS,
  })
  @ApiResponse({
    status: HTTP_STATUS.NOT_FOUND,
    description: RESPONSE_MESSAGES.USER_NOT_FOUND,
  })
  async googleLoginRedirect(@Req() req) {
    // req.user is populated by the Google strategy
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return await this.userService.handleGoogleLogin(req.user);
  }

  @Post('forgot-password/init')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_OTP_SENT,
  })
  async initiatePasswordReset(@Body() dto: PasswordResetInitDto) {
    return await this.userService.initiatePasswordReset(dto.email);
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Verify password reset OTP' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.OTP_VERIFIED_SUCCESS,
  })
  async verifyPasswordResetOTP(@Body() dto: VerifyOtpDto) {
    return await this.userService.verifyPasswordResetOTP(dto.email, dto.otp);
  }

  @Post('forgot-password/reset')
  @HttpCode(HTTP_STATUS.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.userService.resetPassword(dto.email, dto.newPassword, dto.resetToken);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.userService.changePassword(
    //  token,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      req.user.userId,
      // changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @UseGuards(AuthGuard)
  @Post('refresh-token')
  @HttpCode(HTTP_STATUS.OK)
  @ApiBearerAuth()
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
    return await this.userService.refreshTokens(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    //  req.user.userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
//      req.user.deviceId,
      body.refreshToken,
    );
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return await this.userService.addAddress(req.user.userId, createAddressDto);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return await this.userService.getUserAddresses(req.user.userId);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return await this.userService.updateAddress(req.user.userId, addressId, updateAddressDto);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return await this.userService.deleteAddress(req.user.userId, addressId);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return await this.userService.getProfile(req.user.userId);
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
  // Extract access token from Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.replace('Bearer ', '');
  
  if (!accessToken) {
    throw new UnauthorizedException('Access token is required');
  }
  
  return await this.userService.logout(accessToken);
}
}
