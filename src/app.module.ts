import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { getTypeOrmConfig } from './config/database.config.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { MoviesModule } from './modules/movies/movies.module.js';
import { CinemasModule } from './modules/cinemas/cinemas.module.js';
import { ShowtimesModule } from './modules/showtimes/showtimes.module.js';
import { DiscountsModule } from './modules/discounts/discounts.module.js';
import { RedisModule } from './modules/redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    RabbitMQModule,
    MailModule,
    UsersModule,
    AuthModule,
    MoviesModule,
    CinemasModule,
    ShowtimesModule,
    DiscountsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
