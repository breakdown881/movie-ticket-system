import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name)
    private client: Redis;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost')
        const port = this.configService.get<number>('REDIS_PORT', 6379)

        this.client = new Redis({
            host,
            port,
            lazyConnect: true,
            maxRetriesPerRequest:3
        })

        try {
            await this.client.connect()
            this.logger.log(`Connected to Redis at ${host}:${port}`)
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error)
        }
    }

    private async disconnect() {
        try {
            if (this.client) {
                await this.client.quit()
                this.logger.log('Disconnected from Redis')
            }
        } catch (error) {
            this.logger.error('Error disconnecting from Redis', error)
        }
    }

    /**
     * Sinh key định danh cho việc giữ ghế
     */
    private getSeatLockKey(showtimeId: string, seatId: string): string {
        return `seat_lock:${showtimeId}:${seatId}`
    }

    /**
     * Thử khoá 1 ghế duy nhất bằng lệnh SET ... NX EX
     * Trả về true nếu khoá thành công, false nếu đã bị giữ bởi người khác
     */
    async acquireSeatLock(
        showtimeId: string,
        seatId: string,
        reservationId: string,
        ttlSeconds = 600
    ): Promise<boolean> {
        const key = this.getSeatLockKey(showtimeId, seatId)
        const result = await this.client.set(
            key,
            reservationId,
            'EX',
            ttlSeconds,
            'NX'
        )

        return result === 'OK'
    }

    /**
     * Khoá nhiều ghế đồng thời với cơ chế Rollback an toàn:
     * Nếu có BẤT KỲ ghế nào thất bại -> Lập tức nhả toàn bộ các ghế đã khoá trước đó và trả về false.
     */
    async acquireMultipleSeatLocks(
        showtimeId: string,
        seatIds: string[],
        reservationId: string,
        ttlSeconds = 600
    ): Promise<boolean> {
        const acquiredSeats: string[] = [];

        for (const seatId of seatIds) {
            const success = await this.acquireSeatLock(
                showtimeId,
                seatId,
                reservationId,
                ttlSeconds
            )

            if (success) {
                acquiredSeats.push(seatId)
            } else {
                // Rollback: Giải phóng các ghế đã khoá trước đó
                this.logger.warn(`Conflict on seat ${seatId} for showtime ${showtimeId}. Rolling back acquired seats...`)
                await this.releaseMultipleSeatLocks(showtimeId, acquiredSeats)
                return false
            }
        }

        return true
    }

    /**
     * Giải phóng khoá 1 ghế
     */
    async releaseSeatLock(showtimeId: string, seatId: string): Promise<number> {
        const key = this.getSeatLockKey(showtimeId, seatId)
        return this.client.del(key)
    }

    /**
     * Giải phóng khoá nhiều ghế cùng lúc
     */
    async releaseMultipleSeatLocks(showtimeId: string, seatIds: string[]): Promise<void> {
        if (!seatIds || seatIds.length === 0) return

        const keys = seatIds.map((id) => this.getSeatLockKey(showtimeId, id))
        await this.client.del(...keys)
    }

    /**
     * Lấy danh sách ID của tất cả các ghế đang bị khoá (HELD) của 1 suất chiếu
     */
    async getLockedSeatIds(showtimeId: string): Promise<string[]> {
        const pattern = `seat_lock:${showtimeId}:*`
        const keys = await this.client.keys(pattern)
        const prefix = `seat_lock:${showtimeId}:`
        return keys.map((key) => key.replace(prefix, ''))
    }

    /**
     * Trả về trực tiếp Redis client khi cần dùng lệnh đặc thù
     */
    getClient(): Redis {
        return this.client
    }
}