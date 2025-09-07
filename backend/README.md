# Accounting Backend

A robust Go backend API for the accounting application, built with Gin framework and PostgreSQL database.

## Features

- **JWT Authentication**: Secure user authentication with role-based access control
- **RESTful API**: Clean, well-structured API endpoints
- **Database Management**: PostgreSQL with GORM ORM and automatic migrations
- **Role-based Access**: Admin, accountant, and viewer roles with appropriate permissions
- **Comprehensive CRUD**: Full CRUD operations for all entities
- **Data Validation**: Input validation and error handling
- **CORS Support**: Configurable CORS for frontend integration

## Tech Stack

- **Language**: Go 1.21+
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL
- **ORM**: GORM
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt
- **Environment**: godotenv

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get current user profile

### Admin Routes (Admin only)
- `GET /api/v1/admin/users` - List all users
- `POST /api/v1/admin/users` - Create new user
- `GET /api/v1/admin/users/:id` - Get user by ID
- `PUT /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Delete user
- `GET /api/v1/admin/companies` - List all companies
- `POST /api/v1/admin/companies` - Create new company
- `GET /api/v1/admin/companies/:id` - Get company by ID
- `PUT /api/v1/admin/companies/:id` - Update company
- `DELETE /api/v1/admin/companies/:id` - Delete company

### Protected Routes (Authenticated users)
- **Clients**: `/api/v1/clients/*`
- **Invoices**: `/api/v1/invoices/*`
- **Expense Categories**: `/api/v1/expense-categories/*`
- **Expenses**: `/api/v1/expenses/*`

### Admin-only Protected Routes
- **Dividends**: `/api/v1/dividends/*`
- **Tax Returns**: `/api/v1/tax-returns/*`

## Setup

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo>
   cd accounting-backend
   ```

2. **Install dependencies**:
   ```bash
   go mod tidy
   ```

3. **Set up PostgreSQL database**:
   ```sql
   CREATE DATABASE accounting_db;
   CREATE USER accounting_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE accounting_db TO accounting_user;
   ```

4. **Configure environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

5. **Run the application**:
   ```bash
   go run main.go
   ```

The server will start on port 8080 (or the port specified in the PORT environment variable).

### Default Admin User

On first run, a default admin user is created:
- **Email**: admin@example.com
- **Password**: admin123

**Important**: Change the default password after first login!

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_USER` | Database user | accounting_user |
| `DB_PASSWORD` | Database password | password |
| `DB_NAME` | Database name | accounting_db |
| `DB_SSLMODE` | SSL mode | disable |
| `PORT` | Server port | 8080 |
| `GIN_MODE` | Gin mode (debug/release) | debug |
| `JWT_SECRET` | JWT signing secret | (generated) |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:5173 |

## Database Schema

The application uses the following main entities:

- **Users**: User accounts with role-based access
- **Companies**: Company information and tax settings
- **Clients**: Customer/client information
- **Invoices**: Invoice records with automatic calculations
- **Invoice Items**: Line items for invoices
- **Expense Categories**: Expense categorization
- **Expenses**: Business expense records
- **Dividends**: Dividend declarations and payments
- **Tax Returns**: Annual tax calculations and summaries

## API Usage Examples

### Authentication

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# Get profile (requires Authorization header)
curl -X GET http://localhost:8080/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Creating a Company

```bash
curl -X POST http://localhost:8080/api/v1/admin/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Company Inc.",
    "business_number": "123456789",
    "hst_number": "123456789RT0001",
    "fiscal_year_end": "2024-12-31T00:00:00Z",
    "small_business_rate": 0.15,
    "hst_rate": 0.13
  }'
```

### Creating an Invoice

```bash
curl -X POST http://localhost:8080/api/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "client_id": 1,
    "issue_date": "2024-01-15T00:00:00Z",
    "due_date": "2024-02-15T00:00:00Z",
    "description": "Web development services",
    "company_id": 1,
    "items": [
      {
        "description": "Website development",
        "quantity": 40,
        "unit_price": 75.00
      }
    ]
  }'
```

## Development

### Project Structure

```
backend/
├── database/          # Database connection and migrations
├── handlers/          # HTTP request handlers
├── middleware/        # Custom middleware (auth, CORS)
├── models/           # Data models and request/response types
├── utils/            # Utility functions (JWT, password hashing)
├── main.go           # Application entry point
├── go.mod            # Go module file
└── README.md         # This file
```

### Adding New Features

1. **Models**: Add new models in `models/models.go`
2. **Handlers**: Create new handlers in `handlers/`
3. **Routes**: Add routes in `main.go`
4. **Middleware**: Add custom middleware in `middleware/`

### Testing

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...
```

## Deployment

### Production Setup

1. **Set environment variables**:
   ```bash
   export GIN_MODE=release
   export JWT_SECRET=your-super-secret-jwt-key
   export DB_PASSWORD=your-secure-password
   ```

2. **Build the application**:
   ```bash
   go build -o accounting-backend main.go
   ```

3. **Run the application**:
   ```bash
   ./accounting-backend
   ```

### Docker Deployment

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
CMD ["./main"]
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Role-based access control is enforced
- Input validation is performed on all endpoints
- CORS is configured for frontend integration
- Database queries use parameterized statements (GORM)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
