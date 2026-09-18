import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { User } from './user.entity.js';
import {
  ActivityType,
  ActivityStatus,
  ClientPlatform,
} from '../../../common/constants/enums.js';

@Entity('user_activities')
export class UserActivity extends BaseAppEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({
    type: 'enum',
    enum: ActivityType,
    name: 'activity_type',
  })
  activityType: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.SUCCESS,
  })
  status: ActivityStatus;

  @Column({ type: 'varchar', length: 50, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device: string | null;

  @Column({
    type: 'enum',
    enum: ClientPlatform,
    default: ClientPlatform.WEB,
  })
  platform: ClientPlatform;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
