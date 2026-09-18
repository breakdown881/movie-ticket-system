import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Trong môi trường development, dùng transport json/stream hoặc console để test mà không cần SMTP thật
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  /**
   * Gửi email cảnh báo đăng nhập
   */
  async sendLoginAlert(data: {
    email: string;
    fullName: string;
    ipAddress: string;
    device: string;
    browser: string;
    loginTime: string;
  }): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Xin chào ${data.fullName},</h2>
        <p>Tài khoản của bạn vừa được đăng nhập thành công vào hệ thống <strong>Movie Ticket System</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Thời gian:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.loginTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Địa chỉ IP:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Thiết bị:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.device}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Trình duyệt:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${data.browser}</td>
          </tr>
        </table>
        <p style="color: #e53935;">Nếu không phải bạn thực hiện đăng nhập, vui lòng đổi mật khẩu ngay lập tức!</p>
      </div>
    `;

    const info = await this.transporter.sendMail({
      from: '"Cinema Security Team" <security@cinema.com>',
      to: data.email,
      subject: '⚠️ [Bảo mật] Cảnh báo đăng nhập tài khoản',
      html: htmlContent,
    });

    this.logger.log(`Email cảnh báo đăng nhập đã được gửi tới ${data.email}`);
  }

  /**
   * Gửi email kèm đường dẫn đặt lại mật khẩu
   */
  async sendPasswordReset(data: {
    email: string;
    fullName: string;
    resetLink: string;
  }): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Xin chào ${data.fullName},</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <strong>${data.email}</strong>.</p>
        <p>Vui lòng click vào đường dẫn bên dưới để thiết lập mật khẩu mới (Liên kết có hiệu lực trong 15 phút):</p>
        <p style="margin: 25px 0;">
          <a href="${data.resetLink}" style="background-color: #e50914; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Đặt lại mật khẩu
          </a>
        </p>
        <p>Hoặc copy đường dẫn này vào trình duyệt: <br/><code>${data.resetLink}</code></p>
        <p style="color: #777; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.</p>
      </div>
    `;

    const info = await this.transporter.sendMail({
      from: '"Cinema Support" <support@cinema.com>',
      to: data.email,
      subject: '🔑 Yêu cầu đặt lại mật khẩu của bạn',
      html: htmlContent,
    });

    this.logger.log(`Email đặt lại mật khẩu đã được gửi tới ${data.email}`);
  }
}
