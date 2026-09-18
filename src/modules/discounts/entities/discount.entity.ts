import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { DiscountType } from '../../../common/constants/enums.js';

@Entity('discounts')
export class Discount extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    name: 'discount_type',
  })
  discountType: DiscountType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'discount_value',
  })
  discountValue: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'min_order_amount',
  })
  minOrderAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'max_discount_amount',
  })
  maxDiscountAmount: number | null;

  @Column({
    type: 'timestamp with time zone',
    name: 'start_date',
  })
  startDate: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'end_date',
  })
  endDate: Date;

  @Column({
    type: 'int',
    default: 100,
    name: 'usage_limit',
  })
  usageLimit: number;

  @Column({
    type: 'int',
    default: 0,
    name: 'used_count',
  })
  usedCount: number;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  isActive: boolean;
}
