import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../common/entities/base.entity.js';
import { UserRole, AuthProvider } from '../../../common/constants/enums.js';

@Entity('users')
export class User extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 150, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_id' })
  providerId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'reset_password_token',
    select: false,
  })
  resetPasswordToken: string | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'reset_password_expires',
    select: false,
  })
  resetPasswordExpires: Date | null;
}
