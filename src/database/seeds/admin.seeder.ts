import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../modules/users/users.service.js';
import { UserRole, AuthProvider } from '../../common/constants/enums.js';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const adminEmail = this.configService.get<string>(
      'ADMIN_DEFAULT_EMAIL',
      'admin@cinema.com',
    );
    const adminPassword = this.configService.get<string>(
      'ADMIN_DEFAULT_PASSWORD',
      'Admin@123456',
    );

    const existingAdmin = await this.usersService.findByEmail(adminEmail);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await this.usersService.create({
        email: adminEmail,
        password: hashedPassword,
        fullName: 'System Administrator',
        role: UserRole.ADMIN,
        provider: AuthProvider.LOCAL,
      });
      this.logger.log(`Default Admin created successfully: ${adminEmail}`);
    }
  }
}
