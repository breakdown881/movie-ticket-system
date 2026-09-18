import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  EMAIL_QUEUE,
  EMAIL_ROUTING_KEY_LOGIN,
  EMAIL_ROUTING_KEY_RESET,
} from '../rabbitmq/rabbitmq.service.js';
import { MailService } from './mail.service.js';
import type * as amqp from 'amqplib';

@Injectable()
export class MailConsumer implements OnModuleInit {
  private readonly logger = new Logger(MailConsumer.name);

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    // Đợi 1 chút để RabbitMQService hoàn tất kết nối
    setTimeout(() => this.startConsuming(), 1500);
  }

  private async startConsuming() {
    const channel = this.rabbitmqService.getChannel();
    if (!channel) {
      this.logger.warn('RabbitMQ channel not ready to consume');
      return;
    }

    this.logger.log(`Bắt đầu lắng nghe hàng đợi [${EMAIL_QUEUE}]...`);

    channel.consume(EMAIL_QUEUE, async (msg) => {
      if (msg === null) {
        return
      }
      try {
        const routingKey = msg.fields.routingKey
        const data = JSON.parse(msg.content.toString())
        if (routingKey === EMAIL_ROUTING_KEY_LOGIN) {
          await this.mailService.sendLoginAlert(data)
        } else if (routingKey === EMAIL_ROUTING_KEY_RESET) {
          await this.mailService.sendPasswordReset(data)
        }

        channel.ack(msg)
      } catch (error) {
        this.logger.error("Error when execute send message from RabbitMQ", error)
        channel.nack(msg, false, false)
      }
    }, { noAck: false })
    
  }
}
