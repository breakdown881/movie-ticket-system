import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount } from './entities/discount.entity.js';
import { CreateDiscountDto } from './dto/create-discount.dto.js';
import { DiscountType } from '../../common/constants/enums.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
  ) {}

  async createDiscount(dto: CreateDiscountDto): Promise<Discount> {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.discountRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Discount code '${code}' already exists`);
    }

    const discount = this.discountRepository.create({
      ...dto,
      code,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    return this.discountRepository.save(discount);
  }

  async findAll(): Promise<Discount[]> {
    return this.discountRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByCode(code: string): Promise<Discount> {
    const discount = await this.discountRepository.findOne({
      where: { code: code.toUpperCase().trim() },
    });
    if (!discount) {
      throw new NotFoundException(`Discount code '${code}' not found`);
    }
    return discount;
  }

  /**
   * Xác thực và tính toán số tiền được giảm giá
   */
  async validateAndCalculateDiscount(
    code: string,
    orderAmount: number,
  ): Promise<{ discount: Discount; discountAmount: number; finalAmount: number }> {
    const discount = await this.findByCode(code);
    const now = new Date();

    if (!discount.isActive) {
      throw new BadRequestException('Mã giảm giá này đã bị vô hiệu hóa');
    }
    if (discount.startDate > now) {
      throw new BadRequestException('Mã giảm giá chưa đến đợt áp dụng');
    }
    if (discount.endDate < now) {
      throw new BadRequestException('Mã giảm giá đã hết hạn sử dụng');
    }
    if (discount.usedCount >= discount.usageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
    if (orderAmount < Number(discount.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng cần đạt tối thiểu ${discount.minOrderAmount}đ để áp dụng mã này`,
      );
    }

    let discountAmount = 0;
    if (discount.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (orderAmount * Number(discount.discountValue)) / 100;
      if (
        discount.maxDiscountAmount &&
        discountAmount > Number(discount.maxDiscountAmount)
      ) {
        discountAmount = Number(discount.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(discount.discountValue);
    }

    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    const finalAmount = orderAmount - discountAmount;

    return { discount, discountAmount, finalAmount };
  }

  /**
   * Tìm chi tiết 1 mã giảm giá theo ID
   */
  async findById(id: string): Promise<Discount> {
    const discount = await this.discountRepository.findOne({ where: { id } })
    if (!discount) {
      throw new NotFoundException(`Discount with ID '${id}' not found`)
    }
    return discount
  }

  /**
   * Cập nhật thông tin mã giảm giá
   */
  async update(id: string, dto: UpdateDiscountDto): Promise<Discount> {
    const discount = await this.findById(id)

    // Nếu Admin muốn đổi code, kiểm tra xem code mới có bị trùng với mã khác không
    if (dto.code && dto.code.toUpperCase().trim() !== discount.code) {
      const newCode = dto.code.toUpperCase().trim()
      const existing = await this.discountRepository.findOne({ where: { code: newCode } })
      
      if (existing) {
        throw new ConflictException(`Discount code '${newCode}' already exists`)
      }
      discount.code = newCode
    }

    if (dto.discountType) {
      discount.discountType = dto.discountType
    }

    if (dto.discountValue !== undefined) {
      discount.discountValue = dto.discountValue
    }

    if (dto.minOrderAmount !== undefined) {
      discount.minOrderAmount = dto.minOrderAmount
    }

    if (dto.maxDiscountAmount !== undefined) {
      discount.maxDiscountAmount = dto.maxDiscountAmount
    }

    if (dto.startDate) {
      discount.startDate = new Date(dto.startDate)
    }

    if (dto.endDate) {
      discount.endDate = new Date(dto.endDate)
    }

    if (dto.usageLimit !== undefined) {
      discount.usageLimit = dto.usageLimit
    }

    if (dto.isActive !== undefined) {
       discount.isActive = dto.isActive
    }

    return this.discountRepository.save(discount)
  }

  /**
   * Xóa mã giảm giá
   */
  async remove(id: string): Promise<{ message: string }> {
    const discount = await this.findById(id)
    await this.discountRepository.remove(discount)
    return {message: `Discount code '${discount.code}' deleted successfully`}
  }
}
