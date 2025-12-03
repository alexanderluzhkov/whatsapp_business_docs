# 📅 Booking Calendar PWA for Nail Master

A mobile-first Progressive Web App (PWA) for managing client bookings, built with Next.js 14, TypeScript, and Tailwind CSS, integrated with Airtable database.

## 🎯 Project Overview

This app helps a nail master manage 5-7 daily bookings by providing:
- Weekly calendar view with time slots
- Quick booking creation while on phone with clients
- Client and procedure management
- Integration with Airtable database
- Future AI assistant integration via n8n

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Database**: Airtable (REST API)
- **Deployment**: Vercel
- **UI Language**: Russian
- **Timezone**: Asia/Jerusalem

## 📋 Airtable Structure

### Base Information
- **Base ID**: `app1eyXQCnd2SLVbM`

### Tables

#### 1. Clients (`tblQgt4XlHaSeVwcH`)
- `Client_id` (autoNumber, primary)
- `First Name` (singleLineText)
- `Last Name` (singleLineText)
- `Phone_Number` (phoneNumber)
- `Birthday_Date` (date)

#### 2. Procedures (`tblCLhgnNZJHDTmYk`)
- `Name` (singleLineText, primary)
- `Duration` (duration, format: h:mm)
- `Price` (currency, ₪)
- `Active` (checkbox) - only active procedures are shown

#### 3. Bookings (`tbli6JRtdFLXYsJLw`)
- `Booking_Number_New` (autoNumber)
- `Client` (link to Clients, single record)
- `Procedures` (link to Procedures, multiple records)
- `Date` (dateTime with time, timezone: Asia/Jerusalem)
- `Total_Duration` (formula - auto-calculated)
- `Total_Price` (formula - auto-calculated)
- `Token_Used` (checkbox)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Airtable account with access to the base
- Airtable Personal Access Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp_business_docs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   AIRTABLE_API_KEY=your_personal_access_token_here
   AIRTABLE_BASE_ID=app1eyXQCnd2SLVbM
   AIRTABLE_CLIENTS_TABLE_ID=tblQgt4XlHaSeVwcH
   AIRTABLE_PROCEDURES_TABLE_ID=tblCLhgnNZJHDTmYk
   AIRTABLE_BOOKINGS_TABLE_ID=tbli6JRtdFLXYsJLw
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Testing Airtable Connection

Test the API connection:
```bash
curl http://localhost:3000/api/test
```

Expected response:
```json
{
  "success": true,
  "message": "Airtable connection successful",
  "data": {
    "clients": { "count": 10, "sample": {...} },
    "procedures": { "count": 5, "sample": {...} },
    "bookings": { "count": 20, "sample": {...} }
  }
}
```

## 📁 Project Structure

```
whatsapp_business_docs/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── test/            # Test endpoint
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components (to be added)
├── lib/                     # Utility libraries
│   └── airtable/           # Airtable integration
│       ├── client.ts       # API functions
│       ├── config.ts       # Configuration
│       └── index.ts        # Exports
├── types/                   # TypeScript types
│   └── airtable.ts         # Airtable data types
├── .env.local              # Environment variables (not in git)
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## 🔌 Airtable API Integration

The Airtable integration layer provides type-safe functions:

### Clients
- `getClients()` - Fetch all clients
- `getClient(recordId)` - Fetch single client

### Procedures
- `getProcedures()` - Fetch active procedures
- `getAllProcedures()` - Fetch all procedures
- `getProcedure(recordId)` - Fetch single procedure

### Bookings
- `getBookings(startDate?, endDate?)` - Fetch bookings with optional date filter
- `getBooking(recordId)` - Fetch single booking
- `createBooking(data)` - Create new booking
- `updateBooking(recordId, data)` - Update booking
- `deleteBooking(recordId)` - Delete booking

### Usage Example

```typescript
import { getClients, createBooking } from '@/lib/airtable'

// Fetch all clients
const clients = await getClients()

// Create a new booking
const booking = await createBooking({
  Client: ['rec123'],
  Procedures: ['rec456', 'rec789'],
  Date: '2025-12-03T14:00:00.000Z',
  Token_Used: false
})
```

## 📱 Phase 1 Features (MVP)

### 1. Calendar View
- ✅ Weekly view with time grid (9:00-20:00)
- ✅ Display bookings with client name and procedures
- ✅ Visual distinction for available/booked slots
- ✅ Date navigation (prev/next week)
- ✅ "Today" button
- ✅ Tap free slot to create booking

### 2. Create Booking Form
- ✅ Date & time picker (pre-filled from calendar)
- ✅ Searchable client selector
- ✅ Multiple procedure selection
- ✅ Auto-calculated total duration and price
- ✅ Save to Airtable

### 3. Edit/Cancel Booking
- ✅ Edit existing bookings
- ✅ Delete bookings with confirmation

### 4. Drag & Drop (Nice to have)
- ⏳ Drag booking to reschedule

## 🎨 Design Notes

- **Mobile-first**: Optimized for iPhone screen sizes
- **Default theme**: Light mode
- **Language**: Russian (all UI labels)
- **Timezone**: Asia/Jerusalem
- **Working hours**: 9:00 - 20:00 (configurable)
- **Default slot duration**: 30 minutes

## 🔧 Configuration

### Working Hours
Edit in `lib/config.ts` (to be created):
```typescript
export const WORKING_HOURS = {
  start: 9,  // 9:00 AM
  end: 20,   // 8:00 PM
}
```

### Slot Duration
```typescript
export const SLOT_DURATION = 30 // minutes
```

## 🚢 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to add all variables from `.env.local` to your Vercel project settings.

## 📝 Development Guidelines

### Validation Rules
- Cannot create booking in the past
- Cannot create overlapping bookings
- Must select at least one procedure
- Must select a client

### Error Handling
- User-friendly error messages in Russian
- Loading states for all async operations
- Optimistic updates for better UX

### Performance Goals
- Calendar should load within 2 seconds
- Real-time refresh of bookings
- Cached clients and procedures data

## 🔒 Security

- API key stored in environment variables
- Never commit `.env.local` to git
- Airtable API key should be a Personal Access Token with minimal required permissions

## 📚 API Documentation

### Test Endpoint
**GET** `/api/test`

Tests Airtable connection and returns sample data from all tables.

## 🤝 Future Integrations

- AI assistant via n8n
- WhatsApp notifications
- Client self-booking portal

## 🐛 Troubleshooting

### "fetch failed" error
- Check internet connection
- Verify Airtable API key is valid
- Ensure base and table IDs are correct

### "Cannot find module" errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall

### TypeScript errors
- Run `npm run build` to check for type errors
- Ensure all types are properly imported

## 📄 License

Private project for nail master booking management.

## 📧 Support

For issues or questions, contact the development team.
