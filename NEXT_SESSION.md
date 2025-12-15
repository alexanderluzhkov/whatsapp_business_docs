# Mobile Version Implementation - Quick Start

## Task
Make the PWA mobile-responsive. Desktop version is fully functional - don't break it.

## Technical Context
- **Stack:** Next.js 14, TypeScript, Tailwind CSS, Airtable
- **Branch:** `claude/add-booking-form-BvN4L`
- **Current State:** Desktop booking system fully working (create, edit, delete, custom duration)

## What to Implement

### 1. Mobile Calendar View (`/app/calendar/page.tsx`)
- Switch from 7-day grid to single-day view on mobile
- Add swipe/tap navigation between days
- Make booking cards fit mobile width
- Use Tailwind breakpoints: `flex-col md:flex-row`, etc.

### 2. Mobile Booking Form (`/components/BookingForm.tsx`)
- Change `max-w-2xl` to responsive width
- Full-screen or bottom-sheet on mobile
- Touch-friendly inputs (44px min touch targets)
- Test with mobile keyboard

### 3. Mobile Navigation (`/app/calendar/page.tsx` header)
- Make week nav buttons mobile-friendly
- Consider sticky header
- Ensure "Today" button is thumb-reachable

### 4. Mobile Modals (`/components/BookingDetailsModal.tsx`)
- Full-screen on mobile
- Touch-friendly buttons

## Implementation Pattern
```tsx
// Mobile-first Tailwind approach
<div className="
  p-4 md:p-6           // Less padding on mobile
  flex-col md:flex-row  // Stack on mobile, row on desktop
  text-sm md:text-base  // Smaller text on mobile
">
```

## Key Files
- `/app/calendar/page.tsx` - Main calendar (lines 266-545)
- `/components/BookingForm.tsx` - Form modal (working, just needs responsive classes)
- `/components/BookingCard.tsx` - Individual bookings
- `/components/BookingDetailsModal.tsx` - Details popup

## Critical: Don't Break
- Desktop functionality
- Custom duration preference over calculated
- Edit form pre-filling
- Form reset behavior (only on modal open, not prop changes)
- API endpoints

## Test On
- Mobile: 375px (iPhone SE), 390px (iPhone 12), 768px (iPad)
- Desktop: 1024px+

## Questions to Ask User First
1. Single-day or scrollable multi-day view on mobile?
2. Bottom sheet or full-screen modals?
3. Any mobile-specific features needed?

## Success Criteria
- [ ] Calendar readable and navigable on mobile
- [ ] Forms work with mobile keyboard
- [ ] All touch targets ≥44px
- [ ] No horizontal scroll on mobile
- [ ] Desktop still works perfectly

## Git Workflow
```bash
git pull origin claude/add-booking-form-BvN4L
# ... make changes ...
git add .
git commit -m "descriptive message"
git push -u origin claude/add-booking-form-BvN4L
```

**Note:** Branch must start with `claude/` to avoid 403 errors.

---

**Start with:** Ask user about mobile UX preferences, then implement calendar view first.
