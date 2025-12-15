# Mobile Version Implementation Task

## Context
This is a calendar booking PWA (Progressive Web App) for a beauty salon. The desktop version is fully functional. Now we need to implement a mobile-responsive version.

## Current Status ✅

### Completed Features (Desktop)
1. **Calendar View** - Weekly calendar showing bookings
2. **Booking Creation Form** - Create new bookings with client, procedures, date/time
3. **Booking Editing Form** - Edit existing bookings with pre-filled data
4. **Custom Duration Field** - Override calculated procedure duration
5. **Conflict Detection** - Warns when bookings overlap
6. **Booking Details Modal** - View booking details, edit, delete

### Key Technical Details

**Tech Stack:**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Airtable as backend
- Israel timezone (Asia/Jerusalem)

**Data Flow:**
- Duration: Airtable stores in seconds → Display in H:MM format → Internal state in minutes
- Custom Duration: Stored in `Duration_Castomed` field (seconds)
- Display Duration: Prefers `Duration_Castomed` over calculated `Total_Duration`

**Important Files:**
- `/app/calendar/page.tsx` - Main calendar page
- `/components/BookingForm.tsx` - Create/Edit booking form (fully functional)
- `/components/BookingCard.tsx` - Individual booking display
- `/components/BookingDetailsModal.tsx` - Booking details popup
- `/app/api/bookings/route.ts` - GET (list) and POST (create) endpoints
- `/app/api/bookings/[id]/route.ts` - GET, PUT, DELETE for single booking
- `/app/api/clients/route.ts` - GET clients endpoint
- `/app/api/procedures/route.ts` - GET procedures endpoint
- `/lib/airtable/client.ts` - Airtable API functions
- `/types/airtable.ts` - TypeScript types

**Current Branch:** `claude/add-booking-form-BvN4L`

**Git Workflow:**
- All development on branch `claude/add-booking-form-BvN4L`
- Push with: `git push -u origin claude/add-booking-form-BvN4L`
- Branch name must start with 'claude/' and end with session ID to avoid 403 errors

## Task for Next Session 🎯

### Objective
Make the PWA fully responsive and optimized for mobile devices.

### Priority Areas

#### 1. Calendar View (Mobile)
**Current state:** Desktop-only weekly calendar view with 7-column grid

**Mobile requirements:**
- Single-day view (not weekly) for small screens
- Swipe/tap to navigate between days
- Touch-friendly time slots
- Responsive booking cards that fit mobile width
- Consider using media queries: `sm:`, `md:`, `lg:` breakpoints

**Files to modify:**
- `/app/calendar/page.tsx` - Add mobile layout
- `/components/BookingCard.tsx` - Make responsive
- Consider creating `/components/MobileCalendarView.tsx` if needed

#### 2. Booking Form (Mobile)
**Current state:** Desktop modal with fixed width (`max-w-2xl`)

**Mobile requirements:**
- Full-screen or bottom-sheet modal on mobile
- Touch-friendly inputs and checkboxes
- Scrollable procedure list
- Easy-to-tap buttons (44px minimum touch target)
- Virtual keyboard considerations

**Files to modify:**
- `/components/BookingForm.tsx` - Add responsive classes
- Currently uses: `max-w-2xl`, needs mobile breakpoints

#### 3. Navigation (Mobile)
**Current state:** Desktop button layout

**Mobile requirements:**
- Bottom navigation or hamburger menu
- Week navigation optimized for thumb reach
- "Today" button easily accessible
- Consider sticky header on scroll

**Files to modify:**
- `/app/calendar/page.tsx` - Header section (lines ~269-299)

#### 4. Booking Details Modal (Mobile)
**Current state:** Desktop modal

**Mobile requirements:**
- Full-screen or bottom-sheet on mobile
- Touch-friendly buttons
- Easy-to-read text sizes

**Files to modify:**
- `/components/BookingDetailsModal.tsx`

### Technical Approach

#### Responsive Design Strategy
Use Tailwind's mobile-first approach:
```typescript
// Example pattern
<div className="
  flex flex-col        // Mobile: vertical stack
  md:flex-row          // Desktop: horizontal
  gap-2 md:gap-4       // Smaller gap on mobile
  p-4 md:p-6           // Less padding on mobile
">
```

#### Mobile Detection
Consider using:
```typescript
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768)
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

Or use Tailwind's responsive utilities directly in JSX.

#### Touch Interactions
- Minimum touch target: 44x44px
- Add `:active` states for touch feedback
- Consider swipe gestures for navigation (optional, can use library like `react-swipeable`)

### Implementation Steps

1. **Start with Calendar View**
   - Add mobile single-day view
   - Test on different mobile screen sizes
   - Ensure bookings are readable and tappable

2. **Update Booking Form**
   - Make modal responsive
   - Test form inputs on mobile keyboard
   - Ensure all fields are accessible

3. **Update Navigation**
   - Make week navigation mobile-friendly
   - Test touch interactions

4. **Update Modals**
   - Booking details
   - Make full-screen on mobile

5. **Testing**
   - Test on actual mobile devices if possible
   - Use Chrome DevTools mobile emulation
   - Test different screen sizes: iPhone SE (375px), iPhone 12/13 (390px), iPad (768px)

### Key Considerations

**Existing Code Patterns to Follow:**
- All form state managed with `useState`
- Effects use proper dependency arrays
- Client/Server components properly separated
- API routes follow REST conventions

**Important Behaviors to Preserve:**
- Custom duration takes precedence over calculated
- Edit form pre-fills all data
- Conflict detection works in both create and edit modes
- Form only resets when modal opens (not on prop changes)
- Duration hint only shows when manually edited

**Don't Break:**
- Desktop functionality (should work on both)
- Existing API endpoints
- Airtable data structure
- Git branch workflow

### Questions to Clarify with User

Before starting implementation, ask:
1. Single-day vs multi-day view preference for mobile?
2. Bottom sheet vs full-screen modal preference?
3. Any specific mobile breakpoints to target?
4. Should mobile and desktop share same components or separate?
5. Any specific mobile-only features desired?

### Resources

**Tailwind Responsive Docs:**
- https://tailwindcss.com/docs/responsive-design

**PWA Mobile Best Practices:**
- Touch targets: 44x44px minimum
- Avoid horizontal scrolling
- Test with actual devices
- Consider thumb-reach zones

### Success Criteria

The mobile version is complete when:
- [ ] Calendar view works on mobile (readable, navigable)
- [ ] Booking form works on mobile (all fields accessible)
- [ ] Navigation works with touch
- [ ] All modals are mobile-friendly
- [ ] Desktop functionality still works
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets are appropriately sized
- [ ] Tested on multiple screen sizes

## Current Git Status

**Branch:** `claude/add-booking-form-BvN4L`

**Recent commits:**
- Fix edit form not pre-filling by initializing prevIsOpenRef to false
- Fix custom duration display and edit form pre-filling
- Fix create mode form constantly resetting
- Fix booking form bugs: client search and duration initialization
- Add custom duration field for booking visits

**To start work:**
```bash
git status
git pull origin claude/add-booking-form-BvN4L
npm run dev
```

## Notes for Claude

- User prefers concise, technical communication
- Desktop version is fully working - don't break it
- Test thoroughly before committing
- Use TodoWrite for complex tasks
- Follow existing code patterns
- Commit frequently with clear messages
- The user is experienced with React/Next.js, no need to over-explain

Good luck! 🚀
