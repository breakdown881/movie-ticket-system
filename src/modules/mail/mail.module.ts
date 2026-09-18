import { Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { MailConsumer } from './mail.consumer.js';

@Module({
  providers: [MailService, MailConsumer],
  exports: [MailService],
})
export class MailModule {}
