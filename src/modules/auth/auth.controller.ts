import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleLoginDto, FacebookLoginDto } from './dto/social-login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  ClientInfo,
  type ClientInfoDto,
} from '../../common/decorators/client-info.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  register(
    @Body() registerDto: RegisterDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.authService.register(registerDto, clientInfo);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() loginDto: LoginDto, @ClientInfo() clientInfo: ClientInfoDto) {
    return this.authService.login(loginDto, clientInfo);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or auto-register via Google token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  loginWithGoogle(
    @Body() googleLoginDto: GoogleLoginDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.authService.loginWithGoogle(googleLoginDto, clientInfo);
  }

  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or auto-register via Facebook access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  loginWithFacebook(
    @Body() facebookLoginDto: FacebookLoginDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.authService.loginWithFacebook(facebookLoginDto, clientInfo);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link via email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent to email if account exists',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password using reset token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
