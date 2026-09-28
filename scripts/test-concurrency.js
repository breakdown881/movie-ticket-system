/**
 * Script kiểm chứng Race Condition & Redis Distributed Lock
 * Giả lập 20 user cùng tranh 1 ghế tại cùng 1 thời điểm
 */
const BASE_URL = 'http://localhost:3000/api/v1';
async function runConcurrencyTest() {
    console.log('🚀 Bắt đầu kịch bản Concurrency Stress-Test...\n');
    try {
        // 1. Đăng nhập lấy Token
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@cinema.com',
                password: 'Admin@123456',
            }),
        });
        const loginData = await loginRes.json();
        const token = loginData?.data?.accessToken || loginData?.accessToken;
        if (!token) {
            console.error('❌ Không thể đăng nhập. Vui lòng kiểm tra server và tài khoản admin.');
            return;
        }
        console.log('✅ Đăng nhập thành công! Lấy được JWT Token.');
        // 2. Lấy danh sách suất chiếu
        const showtimesRes = await fetch(`${BASE_URL}/showtimes`);
        const showtimesData = await showtimesRes.json();
        const showtimes = showtimesData?.data || showtimesData;
        if (!showtimes || showtimes.length === 0) {
            console.error('❌ Không có suất chiếu nào. Vui lòng tạo 1 suất chiếu trước!');
            return;
        }
        const targetShowtime = showtimes[0];
        console.log(`🎬 Sử dụng suất chiếu: ${targetShowtime.id} (${new Date(targetShowtime.startTime).toLocaleString()})`);
        // 3. Lấy sơ đồ ghế của suất chiếu
        const seatsRes = await fetch(`${BASE_URL}/reservations/showtimes/${targetShowtime.id}/seats`);
        const seatsData = await seatsRes.json();
        const seats = seatsData?.data || seatsData;
        const availableSeats = seats.filter((s) => s.status === 'AVAILABLE');
        if (availableSeats.length === 0) {
            console.error('❌ Tất cả ghế của suất chiếu này đã bị giữ hoặc bán hết!');
            return;
        }
        const targetSeat = availableSeats[0];
        console.log(`🎯 Ghế mục tiêu kiểm thử: [Hàng ${targetSeat.row} - Số ${targetSeat.seatNumber}] (ID: ${targetSeat.id})`);
        console.log('\n⚡ Đang chuẩn bị bắn 20 REQUESTS ĐỒNG THỜI cùng đặt ghế này...');
        // 4. Bắn đồng thời 20 requests bằng Promise.allSettled
        const TOTAL_REQUESTS = 20;
        const holdPromises = Array.from({ length: TOTAL_REQUESTS }, (_, index) =>
            fetch(`${BASE_URL}/reservations/hold`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    showtimeId: targetShowtime.id,
                    seatIds: [targetSeat.id],
                }),
            }).then(async (res) => ({
                requestIndex: index + 1,
                status: res.status,
                data: await res.json(),
            })),
        );
        const results = await Promise.allSettled(holdPromises);
        // 5. Thống kê kết quả
        let successCount = 0;
        let conflictCount = 0;
        let otherCount = 0;
        console.log('\n📊 KẾT QUẢ PHẢN HỒI TỪ SERVER:');
        console.log('------------------------------------------------------------');
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled') {
                const { status, data } = r.value;
                if (status === 201) {
                    successCount++;
                    console.log(`✅ Req #${idx + 1}: HTTP 201 CREATED -> Giữ ghế thành công! (Reservation ID: ${data?.data?.reservation?.id || data?.reservation?.id})`);
                } else if (status === 409) {
                    conflictCount++;
                    console.log(`🛡️ Req #${idx + 1}: HTTP 409 CONFLICT -> Chặn thành công! (${data?.message || 'Conflict'})`);
                } else {
                    otherCount++;
                    console.log(`⚠️ Req #${idx + 1}: HTTP ${status} -> ${JSON.stringify(data)}`);
                }
            } else {
                console.error(`❌ Req #${idx + 1}: Network Error ->`, r.reason);
            }
        });
        console.log('------------------------------------------------------------');
        console.log(`📈 TỔNG KẾT CONCURRENCY:`);
        console.log(`• Thành công (HTTP 201):  ${successCount} (Kỳ vọng: 1)`);
        console.log(`• Bị chặn (HTTP 409):     ${conflictCount} (Kỳ vọng: ${TOTAL_REQUESTS - 1})`);
        console.log(`• Lỗi khác:               ${otherCount}`);
        if (successCount === 1 && conflictCount === TOTAL_REQUESTS - 1) {
            console.log('\n🎉 TEST PASS HOÀN TOÀN! Redis Distributed Lock đã chặn đứng Race Condition!');
        } else {
            console.log('\n❌ Có vấn đề về đồng thời! Cần kiểm tra lại Redis Lock.');
        }
    } catch (err) {
        console.error('❌ Lỗi chạy script test:', err);
    }
}
runConcurrencyTest();