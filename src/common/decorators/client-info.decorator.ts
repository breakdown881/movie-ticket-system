import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import type { Request } from 'express';
import { ClientPlatform } from '../constants/enums.js';

export interface ClientInfoDto {
  ipAddress: string;
  userAgent: string;
  device: string;
  platform: ClientPlatform;
  browser: string;
  os: string;
}

export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfoDto => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Trích xuất địa chỉ IP thực tế kể cả khi đứng sau Nginx / Proxy / Load Balancer
    const forwarded = request.headers['x-forwarded-for'];
    const rawIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : request.socket.remoteAddress || '127.0.0.1';
    const ipAddress = rawIp.replace('::ffff:', '');

    const userAgent = request.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Phân biệt Web vs Mobile App (hỗ trợ Header tùy biến x-client-platform)
    const customPlatformHeader = request.headers[
      'x-client-platform'
    ] as string;
    let platform = ClientPlatform.WEB;
    if (
      customPlatformHeader?.toLowerCase() === 'app' ||
      result.device.type === 'mobile' ||
      result.device.type === 'tablet'
    ) {
      platform =
        customPlatformHeader?.toLowerCase() === 'app'
          ? ClientPlatform.APP
          : ClientPlatform.WEB;
    }

    const device = result.device.model
      ? `${result.device.vendor || ''} ${result.device.model}`.trim()
      : result.device.type || 'Desktop PC';

    const browser = result.browser.name
      ? `${result.browser.name} ${result.browser.major || ''}`.trim()
      : 'Unknown Browser';

    const os = result.os.name
      ? `${result.os.name} ${result.os.version || ''}`.trim()
      : 'Unknown OS';

    return {
      ipAddress,
      userAgent,
      device,
      platform,
      browser,
      os,
    };
  },
);
