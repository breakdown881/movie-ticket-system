import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const CINEMA_EXCHANGE = 'cinema.events';
export const EMAIL_QUEUE = 'cinema.email.queue';
export const EMAIL_ROUTING_KEY_LOGIN = 'email.login_alert';
export const EMAIL_ROUTING_KEY_RESET = 'email.reset_password';
export const HOLD_DELAY_QUEUE = 'cinema.hold.delay.queue';
export const RESERVATION_EXPIRED_QUEUE = 'cinema.reservation.expired.queue';
export const ROUTING_KEY_RESERVATION_EXPIRED = 'reservation.expired';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const url = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Khởi tạo Exchange chính dạng Topic (linh hoạt định tuyến sự kiện)
      await this.channel.assertExchange(CINEMA_EXCHANGE, 'topic', {
        durable: true,
      });

      await this.channel.assertQueue(HOLD_DELAY_QUEUE, {
        durable: true,
        deadLetterExchange: CINEMA_EXCHANGE,
        deadLetterRoutingKey: ROUTING_KEY_RESERVATION_EXPIRED,
        messageTtl: 600000
      })

      await this.channel.assertQueue(RESERVATION_EXPIRED_QUEUE, { durable: true })
      await this.channel.bindQueue(
        RESERVATION_EXPIRED_QUEUE,
        CINEMA_EXCHANGE,
        ROUTING_KEY_RESERVATION_EXPIRED
      )

      

      // Khởi tạo Queue nhận email
      await this.channel.assertQueue(EMAIL_QUEUE, {
        durable: true,
      });

      // Bind Queue với các routing key email
      await this.channel.bindQueue(
        EMAIL_QUEUE,
        CINEMA_EXCHANGE,
        'email.*', // Nhận tất cả routing key bắt đầu bằng email. (email.login_alert, email.reset_password...)
      );

      this.logger.log('Connected to RabbitMQ and configured Exchanges/Queues');
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
    }
  }

  private async disconnect() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('Disconnected from RabbitMQ');
    } catch (err) {
      this.logger.error('Error disconnecting from RabbitMQ', err);
    }
  }

  /**
  * Gửi vé vào hàng đợi chờ 10 phút (gửi thẳng vào queue default exchange "")
  */
  async sendToDelayQueue(queueName: string, message: any): Promise<boolean> {
    if (!this.channel) return false

    const payload = Buffer.from(JSON.stringify(message))
    return this.channel.sendToQueue(queueName, payload, { persistent: true })
  }

  /**
   * Bắn một message (event) lên Exchange với Routing Key
   */
  async publish(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel is not ready');
      return false;
    }

    const payload = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, payload, {
      persistent: true, // Tin nhắn được ghi vào đĩa để chống mất dữ liệu khi broker restart
      timestamp: Date.now(),
    });
  }

  /**
   * Lấy channel hiện tại để phục vụ Consumer lắng nghe
   */
  getChannel(): amqp.Channel {
    return this.channel;
  }
}
