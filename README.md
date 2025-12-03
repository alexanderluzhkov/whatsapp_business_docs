# 📅 Nail Booking Calendar PWA

A mobile-first Progressive Web App for managing nail salon bookings with Airtable integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see PROJECT_README.md)
cp .env.local.example .env.local

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📖 Full Documentation

See [PROJECT_README.md](./PROJECT_README.md) for complete setup instructions, API documentation, and architecture details.

## ✅ Current Status

**Phase 1 - Initial Setup: Complete**
- ✅ Next.js 14 project with TypeScript and Tailwind CSS
- ✅ Airtable API integration layer
- ✅ TypeScript types for all data structures
- ✅ Environment variables configuration
- ✅ Test API endpoint

**Next Steps:**
- Calendar view component
- Booking creation form
- Client and procedure management UI

## 🔑 Environment Setup

Required environment variables in `.env.local`:
- `AIRTABLE_API_KEY` - Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID` - Base ID (app1eyXQCnd2SLVbM)
- `AIRTABLE_CLIENTS_TABLE_ID` - Clients table ID
- `AIRTABLE_PROCEDURES_TABLE_ID` - Procedures table ID
- `AIRTABLE_BOOKINGS_TABLE_ID` - Bookings table ID

## 🧪 Testing Connection

```bash
# Start dev server
npm run dev

# Test Airtable connection
curl http://localhost:3000/api/test
```

## 📁 Key Files

- `app/` - Next.js app router pages and layouts
- `lib/airtable/` - Airtable API integration
- `types/airtable.ts` - TypeScript type definitions
- `components/` - React components (coming soon)

## 🛠 Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Airtable · Vercel
