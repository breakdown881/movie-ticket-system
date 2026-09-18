import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UserActivity } from './entities/user-activity.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AdminSeeder } from '../../database/seeds/admin.seeder.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserActivity])],
  controllers: [UsersController],
  providers: [UsersService, AdminSeeder],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
