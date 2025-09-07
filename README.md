# Contracting Business Accounting Tool

A comprehensive accounting tool built with Go backend and React frontend, designed specifically for incorporated contracting businesses in Canada.

## Features

- **Invoice Management**: Create, track, and manage invoices with automatic HST calculation
- **Expense Tracking**: Record business expenses with categories and receipt tracking
- **Tax Calculations**: Automatic calculation of small business tax and HST remittances
- **Dividend Tracking**: Track dividend distributions and adjust company equity
- **Financial Reports**: Generate P&L statements, HST reports, and retained earnings reports
- **User Authentication**: Role-based access control (admin, accountant, viewer)
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

- **Backend**: Go with Gin framework and PostgreSQL database
- **Frontend**: React 18 with TypeScript
- **Database**: PostgreSQL with GORM ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state
- **Routing**: React Router
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- Node.js 18+ and npm

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo>
   cd accounting-tool
   npm run install-all
   ```

2. **Set up PostgreSQL database**:
   ```sql
   CREATE DATABASE accounting_db;
   CREATE USER accounting_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE accounting_db TO accounting_user;
   ```

3. **Configure backend environment**:
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the backend**:
   ```bash
   cd backend
   go run main.go
   ```

5. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080/api/v1
   - Default login: admin@example.com / admin123

## Database Schema

The application uses the following main entities:

- **users**: User accounts with role-based access
- **companies**: Company information and tax settings
- **clients**: Customer/client information
- **invoices**: Invoice records with automatic calculations
- **invoice_items**: Line items for invoices
- **expense_categories**: Expense categorization
- **expenses**: Business expense records
- **dividends**: Dividend declarations and payments
- **tax_returns**: Annual tax calculations and summaries

## Key Features

### Automatic Calculations

- **Invoice Totals**: Automatically calculates subtotal, HST, and total when items are added/modified
- **Tax Calculations**: Real-time calculation of small business tax and HST remittances
- **Retained Earnings**: Automatic tracking of available distributable cash

### Invoice Management

- Automatic invoice numbering (YYYY-XXXX format)
- HST calculation based on client exemption status
- Status tracking (draft, sent, paid, overdue, cancelled)
- Client relationship management

### Expense Tracking

- Categorized expense recording
- HST paid tracking for input tax credits
- Receipt attachment support
- Date-based filtering and reporting

### Tax Compliance

- Small business tax calculation (configurable rate)
- HST collected vs. paid tracking
- Automatic remittance calculations
- Fiscal year reporting

### Reporting

- Profit & Loss statements (pre and post-tax)
- HST collected vs. paid reports
- Retained earnings tracking
- Client and expense summaries

## Development

### Project Structure

```
├── backend/                 # Go backend application
│   ├── database/           # Database connection and migrations
│   ├── handlers/           # HTTP request handlers
│   ├── middleware/         # Custom middleware (auth, CORS)
│   ├── models/            # Data models and request/response types
│   ├── utils/             # Utility functions (JWT, password hashing)
│   ├── main.go            # Application entry point
│   └── go.mod             # Go module file
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── lib/          # API client and types
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main application component
│   └── package.json
└── package.json           # Root package.json with scripts
```

### Available Scripts

- `npm run dev`: Start frontend development server
- `npm run backend`: Start Go backend server
- `npm run frontend`: Start frontend development server
- `npm run dev-full`: Start both backend and frontend concurrently
- `npm run build`: Build frontend for production
- `npm run install-all`: Install dependencies for both root and frontend

### Adding New Features

1. **Backend**: Add new models in `backend/models/`, handlers in `backend/handlers/`, and routes in `backend/main.go`
2. **Frontend**: Create new components in `frontend/src/components/` and pages in `frontend/src/pages/`
3. **Types**: Update TypeScript interfaces in `frontend/src/lib/api.ts`

## Deployment

### Production Setup

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Deploy Go backend**:
   - Set production environment variables
   - Build the Go binary: `cd backend && go build -o accounting-backend main.go`
   - Deploy to your server with PostgreSQL database
   - Set up SSL certificates and reverse proxy

3. **Configure frontend**:
   - Update API URL in `frontend/.env`
   - Deploy built files to your web server

### Environment Variables

- `VITE_API_URL`: URL of your Go backend API (default: http://localhost:8080/api/v1)
- Backend environment variables (see `backend/env.example`)

## Security Considerations

- JWT-based authentication with secure token handling
- Role-based access control ensures users only see appropriate data
- Input validation and sanitization handled by Go backend
- Password hashing using bcrypt
- HTTPS recommended for production deployments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the migration guide: `MIGRATION_GUIDE.md`
2. Review the backend documentation: `backend/README.md`
3. Create an issue in the repository

## Roadmap

- [ ] PDF invoice generation
- [ ] Email invoice sending
- [ ] Bank account integration
- [ ] Multi-company support
- [ ] Advanced reporting with charts
- [ ] Mobile app
- [ ] API for third-party integrations
