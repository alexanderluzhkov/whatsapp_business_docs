'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  formatDate,
  formatDateLong,
  isToday,
  generateTimeSlots,
  isSameDay,
  DAYS_OF_WEEK_RU,
  getMonthViewDays,
  getPreviousMonth,
  getNextMonth,
  isSameMonth,
  getMonthName,
} from '@/lib/calendar-utils'
import type { BookingDisplay } from '@/types/airtable'
import BookingCard from '@/components/BookingCard'
import BookingDetailsModal from '@/components/BookingDetailsModal'
import BookingForm from '@/components/BookingForm'
import SyncModal from '@/components/SyncModal'

export default function CalendarPage() {
  // Navigation state
  const [viewDate, setViewDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
  const mainRef = useRef<HTMLElement>(null)

  // Booking state
  const [bookings, setBookings] = useState<BookingDisplay[]>([])
  const [rawBookings, setRawBookings] = useState<any[]>([]) // Store raw Airtable data
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingDisplay | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)

  // Booking form state
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null)
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false)
  const [editBookingData, setEditBookingData] = useState<{
    id: string
    clientId: string
    procedureIds: string[]
    customDuration?: number // in minutes
    isMeTime?: boolean
    meTimeTitle?: string
  } | null>(null)

  // Memoized calendar days for the current viewDate month
  const calendarDays = useMemo(() => getMonthViewDays(viewDate), [viewDate])
  const timeSlots = generateTimeSlots()

  // Scroll to top when switching to day view to show the start of the day (8:00)
  useEffect(() => {
    if (viewMode === 'day' && mainRef.current) {
      mainRef.current.scrollTo(0, 0)
    }
  }, [viewMode])

  // Fetch bookings for the current visible calendar month
  const fetchBookings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate the range for the entire month grid
      const gridStart = calendarDays[0]
      const gridEnd = calendarDays[calendarDays.length - 1]

      const startStr = gridStart.toISOString().split('T')[0]
      const endStr = gridEnd.toISOString().split('T')[0]

      // Fetch bookings from API route
      const response = await fetch(`/api/bookings?startDate=${startStr}&endDate=${endStr}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings')
      }

      const allBookings = data.bookings
      setRawBookings(allBookings)

      // Parse bookings
      const parsedBookings: BookingDisplay[] = allBookings
        .map((booking: any) => {
          const fields = booking.fields
          if (!fields.Date) return null

          // Get duration
          let totalDuration = '0:00'
          if (fields.Duration_Castomed) {
            const totalSeconds = fields.Duration_Castomed
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            totalDuration = `${hours}:${minutes.toString().padStart(2, '0')}`
          } else if (fields.Total_Duration) {
            totalDuration = fields.Total_Duration
          }

          return {
            id: booking.id,
            clientName: fields['Name (from Client)']?.[0] || 'Unknown',
            clientPhone: fields['Phone_Number']?.[0] || 'Not specified',
            date: fields.Date,
            procedures: fields['Name (from Procedures)'] || [],
            totalDuration,
            totalPrice: fields.Total_Price || 0,
            bookingNumber: fields.Booking_Number_New || 0,
            isMeTime: !!fields.Is_Me_Time,
            meTimeTitle: fields.Me_Time_Title,
          }
        })
        .filter((booking: BookingDisplay | null): booking is BookingDisplay => booking !== null)

      setBookings(parsedBookings)
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError('Не удалось загрузить записи')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [calendarDays])

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') {
      setViewDate(getPreviousMonth(viewDate))
    } else {
      const prevDay = new Date(viewDate)
      prevDay.setDate(prevDay.getDate() - 1)
      setViewDate(prevDay)
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewDate(getNextMonth(viewDate))
    } else {
      const nextDay = new Date(viewDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setViewDate(nextDay)
    }
  }

  const handleToday = () => {
    const today = new Date()
    setViewDate(today)
    setViewMode('month')
  }

  const handleDayClick = (date: Date) => {
    setViewDate(date)
    setViewMode('day')
  }

  // Booking logic helpers
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':')
    return parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10)
  }

  const calculateBookingHeight = (duration: string): number => {
    return (parseDuration(duration) / 30) * 36
  }

  const findBookingForSlot = (date: Date, hour: number, minute: number): BookingDisplay | undefined => {
    return bookings.find((booking) => {
      const d = new Date(booking.date)
      return isSameDay(d, date) && d.getHours() === hour && d.getMinutes() === minute
    })
  }

  const isSlotOccupiedByEarlierBooking = (date: Date, hour: number, minute: number): boolean => {
    return bookings.some((booking) => {
      const d = new Date(booking.date)
      if (!isSameDay(d, date)) return false

      const start = d.getHours() * 60 + d.getMinutes()
      const duration = parseDuration(booking.totalDuration)
      const end = start + duration
      const current = hour * 60 + minute

      return current > start && current < end
    })
  }

  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    setSelectedSlot({ date, time: timeLabel })
    setIsBookingFormOpen(true)
  }

  const handleBookingClick = (booking: BookingDisplay) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const handleEditBooking = () => {
    if (!selectedBooking) return
    const raw = rawBookings.find((b) => b.id === selectedBooking.id)
    if (!raw) return

    setEditBookingData({
      id: selectedBooking.id,
      clientId: raw.fields.Client?.[0],
      procedureIds: raw.fields.Procedures || [],
      customDuration: raw.fields.Duration_Castomed ? Math.floor(raw.fields.Duration_Castomed / 60) : undefined,
      isMeTime: !!raw.fields.Is_Me_Time,
      meTimeTitle: raw.fields.Me_Time_Title,
    })
    const d = new Date(selectedBooking.date)
    setSelectedSlot({ date: d, time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` })
    setIsBookingFormOpen(true)
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm flex-none z-50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Календарь</h1>
            <div className="flex items-center gap-3">
              {viewMode === 'day' && (
                <button
                  onClick={() => setViewMode('month')}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700"
                >
                  ← Месяц
                </button>
              )}
              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Сегодня
              </button>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="Синхронизировать с телефоном"
              >
                📅
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handlePrevious}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex-none"
              aria-label="Previous"
            >
              ←
            </button>

            <div className="flex-1 text-center font-bold text-gray-800 text-sm truncate">
              {viewMode === 'month'
                ? `${getMonthName(viewDate)} ${viewDate.getFullYear()}`
                : formatDateLong(viewDate)}
            </div>

            <button
              onClick={handleNext}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex-none"
              aria-label="Next"
            >
              →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-gray-500 font-medium">Загрузка записей...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="m-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-center">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="p-4">
            {viewMode === 'month' ? (
              /* MONTH VIEW GRID */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                  {DAYS_OF_WEEK_RU.map((day) => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((date) => {
                    const isTodayDate = isToday(date)
                    const isSelectedMonth = isSameMonth(date, viewDate)
                    const dailyBookings = bookings.filter(b => isSameDay(new Date(b.date), date))

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        className={`aspect-square p-2 border-b border-r border-gray-50 flex flex-col items-center justify-between transition-all relative
                          ${!isSelectedMonth ? 'opacity-30' : ''}
                          ${isTodayDate ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                        `}
                      >
                        <span className={`text-sm font-semibold ${isTodayDate ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md shadow-blue-200' : 'text-gray-700'}`}>
                          {date.getDate()}
                        </span>

                        {dailyBookings.length > 0 && isSelectedMonth && (
                          <div className="w-6 h-6 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                            {dailyBookings.length}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* DAY VIEW SCHEDULE */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {timeSlots.map((slot) => {
                    const booking = findBookingForSlot(viewDate, slot.hour, slot.minute)
                    const isOccupied = isSlotOccupiedByEarlierBooking(viewDate, slot.hour, slot.minute)

                    return (
                      <div
                        key={slot.label}
                        className={`flex min-h-[36px] transition-colors relative ${!booking && !isOccupied ? 'hover:bg-blue-50/50 active:bg-blue-50 cursor-pointer' : ''}`}
                        onClick={() => !booking && !isOccupied && handleSlotClick(viewDate, slot.hour, slot.minute)}
                      >
                        <div className="w-16 flex-none bg-gray-50/50 border-r border-gray-100 px-2 py-2 text-[10px] font-medium text-gray-400 text-right">
                          {slot.label}
                        </div>
                        <div className="flex-1 p-1 relative">
                          {booking && (
                            <div
                              style={{ height: `${calculateBookingHeight(booking.totalDuration)}px` }}
                              className="absolute top-1 left-1 right-1 z-20"
                            >
                              <BookingCard
                                clientName={booking.clientName}
                                procedures={booking.procedures}
                                totalDuration={booking.totalDuration}
                                isMeTime={booking.isMeTime}
                                meTimeTitle={booking.meTimeTitle}
                                onClick={() => handleBookingClick(booking)}
                              />
                            </div>
                          )}
                          {isOccupied && <div className="h-full w-full bg-gray-50/30 rounded-lg" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-8 text-center text-gray-400 text-xs italic">
          {viewMode === 'month' ? 'Нажмите на день, чтобы увидеть расписание' : 'Нажмите на время, чтобы создать запись'}
        </div>
      </main>

      {/* Modals */}
      <BookingDetailsModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking ? { ...selectedBooking } : null}
        onEdit={handleEditBooking}
      />

      {/* Booking Form */}
      <BookingForm
        isOpen={isBookingFormOpen}
        onClose={() => {
          setIsBookingFormOpen(false)
          setEditBookingData(null)
        }}
        selectedDate={selectedSlot?.date || new Date()}
        selectedTime={selectedSlot?.time || '09:00'}
        onBookingCreated={fetchBookings}
        existingBookings={bookings}
        editMode={!!editBookingData}
        bookingId={editBookingData?.id}
        initialClientId={editBookingData?.clientId}
        initialProcedureIds={editBookingData?.procedureIds}
        initialCustomDuration={editBookingData?.customDuration}
        initialIsMeTime={editBookingData?.isMeTime}
        initialMeTimeTitle={editBookingData?.meTimeTitle}
      />

      {/* Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </div>
  )
}
