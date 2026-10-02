FROM node:24-alpine AS builder
WORKDIR /app
# Copy các file định nghĩa dependencies trước để tận dụng Docker layer cache
# (Gợi ý: copy package.json và package-lock.json)
COPY package*.json ./
# Cài đặt đầy đủ dependencies (kể cả devDependencies) bằng lệnh npm ci
RUN npm ci
#  Copy toàn bộ source code vào container
COPY . .
# Chạy lệnh build NestJS để tạo thư mục dist/
RUN npm run build
# ==========================================
# Chạy ứng dụng Production (Runner)
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app
# Đặt biến môi trường mặc định là production
ENV NODE_ENV=production
# Copy package.json và package-lock.json từ máy host sang runner
COPY package*.json ./
# Chỉ cài đặt dependencies cần thiết cho runtime (bỏ qua devDependencies như vitest, tsc...) và xóa sạch cache npm để giữ image nhẹ nhất có thể
RUN npm ci --omit=dev && npm cache clean --force
# Copy thư mục dist đã biên dịch từ Stage 1 (builder) sang
# Dùng cờ --chown=node:node để gán quyền sở hữu ngay lúc copy
COPY --chown=node:node --from=builder /app/dist ./dist
# Bảo mật: Chuyển quyền sở hữu thư mục /app cho user 'node' và chuyển sang USER node
USER node
# Expose cổng mặc định của NestJS (Port 3000)
EXPOSE 3000
# Khởi chạy trực tiếp file main.js bằng Node runtime
CMD ["node", "dist/main.js"]