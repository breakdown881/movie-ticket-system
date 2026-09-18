# 🎬 Movie Ticket Reservation System (Backend)

[![NestJS](https://img.shields.io/badge/NestJS-v12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0879?logo=typeorm&logoColor=white)](https://typeorm.io/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

An enterprise-grade, high-throughput backend system for movie theater reservations built with **NestJS**, **PostgreSQL**, **Redis**, and **RabbitMQ**. Engineered using **Clean Architecture** and **Event-Driven Architecture (EDA)** principles to resolve industry-standard challenges: race condition handling (double booking), automated 10-minute seat holding, multi-provider authentication, client security audit logging, discount engine, and box office lifetime reporting.

---

## 🌟 Key Architectural Highlights

* 🛡️ **Race Condition Mitigation & Seat Holding (Level 2 - Cinema Grade)**:
  * **Redis Distributed Locking (`SETNX` with TTL)**: Prevents millisecond-level ticket collision when multiple users contend for high-demand seats simultaneously.
  * **RabbitMQ Dead Letter Exchange (DLX) & TTL**: Automatically releases held seats and expires unpaid reservations after 10 minutes without heavy cron database scanning.
  * **Database-Level Protection**: Pessimistic locking (`SELECT FOR UPDATE`) and composite unique constraints `UNIQUE(showtime_id, seat_id)` ensuring strict ACID compliance.
* 🐰 **Event-Driven Message Bus (RabbitMQ)**:
  * Decouples heavy third-party I/O (login alerts, password reset emails, booking confirmation tickets) from the main HTTP request loop using Topic Exchanges and Manual Message Acknowledgment (`ack`/`nack`).
* 🔐 **Robust Authentication & RBAC**:
  * **3 Authentication Strategies**: Local (Bcrypt + JWT), Google OpenID Token verification, and Facebook Graph API integration with automated account provisioning.
  * **Role-Based Access Control**: Decorator-driven authorization (`@Roles(UserRole.ADMIN)`) with automatic database bootstrapping for system administrators.
  * **Cryptographic Password Recovery**: 256-bit entropy random tokens with 15-minute expiration and anti-replay protection.
* 🕵️ **Real-Time Client & Audit Tracking**:
  * Seamlessly extracts client IP (handling reverse proxies / load balancers) and parses `User-Agent` headers into structured device metadata (`Apple iPhone`, `Chrome 128`, `Windows 11`, `Web` vs `Mobile App`) on every login and payment attempt.
* 🎟️ **Promo & Discount Engine**:
  * Supports `PERCENTAGE` and `FIXED_AMOUNT` vouchers with minimum order thresholds, maximum discount ceilings, validity periods, and usage limits.
* 📊 **Lifetime Movie & Box Office Analytics**:
  * Complex analytical SQL aggregations to calculate total lifetime ticket volume, gross box office revenue, and seat occupancy percentages from movie premiere to final screening.

---

## 🏗️ System Architecture & Event Flow

```
                                  +-----------------------+
                                  |  Web / Mobile Client  |
                                  +-----------+-----------+
                                              | HTTP / REST
                                              v
                              +---------------+---------------+
                              |    NestJS Modular Monolith    |
                              |  (Guards, Pipes, Controllers) |
                              +-------+---------------+-------+
                                      |               |
             +------------------------+               +------------------------+
             |                                                                 |
             v (Cache & Atomic Locks)                                          v (Events)
  +----------+----------+                                           +----------+----------+
  |    Redis 7 Cluster  |                                           |  RabbitMQ Broker    |
  |  - Seat Hold (10m)  |                                           |  - Topic Exchange   |
  |  - Rate Limiting    |                                           |  - Email Queue      |
  +---------------------+                                           |  - DLX Expire Queue |
                                                                    +----------+----------+
             ^                                                                 |
             |                                                                 v
+------------+------------+                                         +----------+----------+
| PostgreSQL 16 Database  | <---------------------------------------| Background Consumer |
| - Users & Audit Logs    |          (Async DB Updates)             | - Mailer Service    |
| - Movies & Showtimes    |                                         | - Seat Release      |
| - Reservations & Seats  |                                         +---------------------+
| - Discounts & Payments  |
+-------------------------+
```

---

## 📐 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ user_activities : "logs"
    users ||--o{ reservations : "places"
    movies ||--|{ movie_genres : "has"
    genres ||--|{ movie_genres : "belongs to"
    movies ||--o{ showtimes : "scheduled in"
    halls ||--o{ showtimes : "hosts"
    halls ||--|{ seats : "contains"
    showtimes ||--o{ reservations : "booked for"
    reservations ||--|{ reservation_seats : "includes"
    seats ||--o{ reservation_seats : "reserved as"
    reservations ||--o{ payments : "paid via"
    discounts ||--o{ reservations : "applies to"

    users {
        uuid id PK
        string email UK
        string password "hashed, nullable for OAuth"
        string full_name
        string phone
        string avatar_url
        enum role "USER | ADMIN"
        enum provider "LOCAL | GOOGLE | FACEBOOK"
        string provider_id
        string reset_password_token
        timestamp reset_password_expires
        timestamp created_at
        timestamp updated_at
    }

    user_activities {
        uuid id PK
        uuid user_id FK
        enum activity_type "LOGIN | PAYMENT"
        enum status "SUCCESS | FAILED"
        string ip_address
        string device
        enum platform "WEB | APP"
        string browser
        string os
        jsonb metadata
        timestamp created_at
    }

    movies {
        uuid id PK
        string title
        text description
        string poster_url
        int duration_minutes
        date release_date
        date end_date
        timestamp created_at
    }

    halls {
        uuid id PK
        string name
        int total_seats
    }

    seats {
        uuid id PK
        uuid hall_id FK
        string row
        int seat_number
        enum seat_type "STANDARD | VIP | COUPLE"
    }

    showtimes {
        uuid id PK
        uuid movie_id FK
        uuid hall_id FK
        timestamp start_time
        timestamp end_time
        decimal price
    }

    reservations {
        uuid id PK
        uuid user_id FK
        uuid showtime_id FK
        uuid discount_id FK
        decimal subtotal
        decimal discount_amount
        decimal total_amount
        enum status "PENDING | CONFIRMED | CANCELLED | EXPIRED"
        timestamp expires_at
    }

    reservation_seats {
        uuid id PK
        uuid reservation_id FK
        uuid showtime_id FK
        uuid seat_id FK
        decimal price
    }

    payments {
        uuid id PK
        uuid reservation_id FK
        enum payment_method "BANK_TRANSFER | MOMO | VNPAY"
        enum status "PENDING | SUCCESS | FAILED | REFUNDED"
        decimal amount
        string transaction_id
        text payment_url
        jsonb raw_response
    }

    discounts {
        uuid id PK
        string code UK
        enum discount_type "PERCENTAGE | FIXED_AMOUNT"
        decimal discount_value
        decimal min_order_amount
        decimal max_discount_amount
        int usage_limit
        int used_count
        boolean is_active
        timestamp start_date
        timestamp end_date
    }
```

---

## 🚀 Quick Start

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v20+ or v24 LTS)
* [Docker & Docker Compose](https://www.docker.com/)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/movie-ticket-system.git
cd movie-ticket-system
npm install
```

### 3. Spin Up Infrastructure (PostgreSQL, Redis, RabbitMQ)
```bash
docker compose up -d
```
Verify all services are running:
* **PostgreSQL**: `localhost:5432`
* **Redis**: `localhost:6379`
* **RabbitMQ AMQP**: `localhost:5672`
* **RabbitMQ Web Dashboard**: `http://localhost:15672` (Credentials: `guest` / `guest`)

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 5. Run the Application
```bash
# Development mode with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 6. Explore Interactive API Documentation
Once started, visit Swagger UI:
👉 **`http://localhost:3000/api/docs`**

---

## 🧪 API Endpoints Overview

| Module | Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Register with email and password |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Login with email and password |
| **Auth** | `POST` | `/api/v1/auth/google` | Public | Token exchange login / auto-register with Google |
| **Auth** | `POST` | `/api/v1/auth/facebook` | Public | Access token login / auto-register with Facebook |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Public | Request secure password reset link |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Public | Complete password reset using token |
| **Users** | `GET` | `/api/v1/users/me` | User | Get profile of logged-in user |
| **Users** | `GET` | `/api/v1/users` | Admin | List all registered users |
| **Users** | `PATCH`| `/api/v1/users/:id/role` | Admin | Promote or modify user role |
| **Movies**| `CRUD`| `/api/v1/movies` | Admin/Public | Manage movies catalog & genres |
| **Halls** | `CRUD`| `/api/v1/halls` | Admin | Manage cinema halls and seat layouts |
| **Showtimes** | `CRUD` | `/api/v1/showtimes` | Admin/Public | Schedule movie showtimes (Anti-conflict) |
| **Reservations** | `POST` | `/api/v1/reservations/hold` | User | Temporarily hold seats (10m TTL) |
| **Payments** | `POST` | `/api/v1/payments/checkout` | User | MoMo / VNPay / Bank transfer checkout |
| **Reports** | `GET` | `/api/v1/reporting/movies/:id` | Admin | Movie lifetime revenue & ticket stats |

---

## 🔒 Security & Best Practices
* **Password Hashing**: Bcrypt with salt rounds = 10. Sensitive fields excluded from queries by default via `{ select: false }`.
* **Input Sanitization**: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` to prevent mass-assignment attacks.
* **Audit Logging**: Comprehensive logging of client IP, device, browser, and OS on critical actions.
* **Anti-Enumeration Defense**: Generic responses for forgot password requests to prevent username harvesting.

---

## 📄 License
This project is licensed under the MIT License.
