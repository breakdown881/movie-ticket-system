import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserActivity } from '../users/entities/user-activity.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleLoginDto, FacebookLoginDto } from './dto/social-login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import {
  ActivityType,
  ActivityStatus,
  AuthProvider,
} from '../../common/constants/enums.js';
import type { ClientInfoDto } from '../../common/decorators/client-info.decorator.js';
import {
  RabbitMQService,
  CINEMA_EXCHANGE,
  EMAIL_ROUTING_KEY_LOGIN,
  EMAIL_ROUTING_KEY_RESET,
} from '../rabbitmq/rabbitmq.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly rabbitmqService: RabbitMQService,
    @InjectRepository(UserActivity)
    private readonly activityRepository: Repository<UserActivity>,
  ) {}

  /**
   * Helper: Ghi log lịch sử hoạt động (Activity Log / Audit Trail)
   */
  async recordActivity(
    userId: string | null,
    activityType: ActivityType,
    status: ActivityStatus,
    clientInfo: ClientInfoDto,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const activity = this.activityRepository.create({
        userId,
        activityType,
        status,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        device: clientInfo.device,
        platform: clientInfo.platform,
        browser: clientInfo.browser,
        os: clientInfo.os,
        metadata: metadata || null,
      });
      await this.activityRepository.save(activity);
    } catch (err) {
      this.logger.error('Failed to record activity log', err);
    }
  }

  /**
   * Helper: Tạo JWT Payload và Token trả về cho Client
   */
  async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async sendLoginAlertEmail(user: User, clientInfo: ClientInfoDto): Promise<void> {
    const message = {
      email: user.email,
      fullname: user.fullName,
      ipAddress: clientInfo.ipAddress,
      device: clientInfo.device,
      browser: clientInfo.browser,
      loginTime: new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})
    }
    await this.rabbitmqService.publish(CINEMA_EXCHANGE, EMAIL_ROUTING_KEY_LOGIN, message)
  }

  async register(
    registerDto: RegisterDto,
    clientInfo: ClientInfoDto,
  ): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
    });

    await this.recordActivity(
      user.id,
      ActivityType.LOGIN,
      ActivityStatus.SUCCESS,
      clientInfo,
      { action: 'REGISTER' },
    );

    return this.generateAuthResponse(user);
  }

  async login(
    loginDto: LoginDto,
    clientInfo: ClientInfoDto,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (
      !user ||
      user.password === null ||
      !(await bcrypt.compare(loginDto.password, user.password))
    ) {
      await this.recordActivity(
        user?.id ?? null,
        ActivityType.LOGIN,
        ActivityStatus.FAILED,
        clientInfo,
        { action: 'LOGIN' },
      );
      throw new UnauthorizedException(
        'Email or password is incorrect. Please try later!',
      );
    }

    await this.recordActivity(
      user.id,
      ActivityType.LOGIN,
      ActivityStatus.SUCCESS,
      clientInfo,
      { action: 'LOGIN' },
    );

    await this.sendLoginAlertEmail(user, clientInfo);

    return this.generateAuthResponse(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email)
    if (!user) {
      return {message: 'If email is existed, link to reset password is sent'}
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 15 * 60 * 1000)
    await this.usersService.update(user.id, { resetPasswordToken: resetToken, resetPasswordExpires: expires })
    const resetLink = `http://localhost:3000/api/v1/auth/reset-password?token=${resetToken}`
    await this.rabbitmqService.publish(CINEMA_EXCHANGE, EMAIL_ROUTING_KEY_RESET, {
      email: user.email,
      fullName: user.fullName,
      resetLink
    })

    return { message: 'If email is existed, link to reset password is sent' }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken(resetPasswordDto.token)
    if (!user || (user?.resetPasswordExpires ?? 0) < new Date()) {
      throw new BadRequestException('Reset password code is invalid or expire. Please try later!')
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10)
    await this.usersService.update(user.id, { password: hashedPassword, resetPasswordExpires: null, resetPasswordToken: null })
    return {message: "Reset password successfully! You can use new password to login."}
  }

  async loginWithGoogle(
    googleLoginDto: GoogleLoginDto,
    clientInfo: ClientInfoDto,
  ): Promise<AuthResponseDto> {
    // Hỗ trợ mock token hoặc fetch thật:
    let googleUser: { sub: string; email: string; name: string; picture?: string }
    
    if (googleLoginDto.token.startsWith('mock_google_')) {
      googleUser = {
        sub: 'google_test_id_123',
        email: 'google.tester@gmail.com',
        name: 'Google Test User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      }
    } else {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleLoginDto.token}`)
      if (!res.ok) {
        throw new UnauthorizedException("Google token is invalid or expired. Please try later!")
      }
      googleUser = await res.json();
    }

    let user = await this.usersService.findByEmail(googleUser.email)
    if (!user) {
      const newUser = {
        provider: AuthProvider.GOOGLE,
        password: null,
        providerId: googleUser.sub,
        fullName: googleUser.name,
        avatarUrl: googleUser.picture,
        email: googleUser.email
      }
      user = await this.usersService.create(newUser)
    }
    
    await this.recordActivity(user.id, ActivityType.LOGIN, ActivityStatus.SUCCESS, clientInfo, { "action": "LOGIN" })
    await this.sendLoginAlertEmail(user, clientInfo)
    return this.generateAuthResponse(user)
  }

  async loginWithFacebook(
    facebookLoginDto: FacebookLoginDto,
    clientInfo: ClientInfoDto,
  ): Promise<AuthResponseDto> {
    let facebookUser: { sub: string; email: string; name: string; picture?: string }
    if (facebookLoginDto.accessToken.startsWith('mock_facebook_')) {
      facebookUser = {
        sub: 'facebook_test_id_123',
        email: 'facebook.tester@gmail.com',
        name: 'Facebook Test User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      }
    } else {
      const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${facebookLoginDto.accessToken}`);
      if (!res.ok) {
        throw new UnauthorizedException("Facebook access token is invalid or expired. Please try later!")
      }
      facebookUser = await res.json();
    }

    let user = await this.usersService.findByEmail(facebookUser.email)
    if (!user) {
      const newUser = {
        provider: AuthProvider.FACEBOOK,
        password: null,
        providerId: (facebookUser as any).id || facebookUser.sub,
        fullName: facebookUser.name,
        avatarUrl: (facebookUser as any).picture?.data?.url || facebookUser.picture || null,
        email: facebookUser.email
      }
      user = await this.usersService.create(newUser)
    }
    
    await this.recordActivity(user.id, ActivityType.LOGIN, ActivityStatus.SUCCESS, clientInfo, { "action": "LOGIN" })
    await this.sendLoginAlertEmail(user, clientInfo)
    return this.generateAuthResponse(user)
  }
}
