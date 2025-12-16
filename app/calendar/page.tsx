'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getSunday,
  getWeekDates,
  formatDate,
  formatDateLong,
  isToday,
  isCurrentWeek,
  generateTimeSlots,
  getPreviousWeek,
  getNextWeek,
  DAYS_OF_WEEK_RU,
} from '@/lib/calendar-utils'
import type { BookingFromAirtable, BookingDisplay } from '@/types/airtable'
import BookingCard from '@/components/BookingCard'
import BookingDetailsModal from '@/components/BookingDetailsModal'

export default function CalendarPage() {
  // State for current week (Sunday - Israel timezone)
  const [currentSunday, setCurrentSunday] = useState(() => getSunday(new Date()))

  // Get dates for the current week
  const weekDates = getWeekDates(currentSunday)
  const timeSlots = generateTimeSlots()

  // Booking state
  const [bookings, setBookings] = useState<BookingDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingDisplay | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Mobile: selected day index (0 = Sunday, 6 = Saturday)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    // Initialize with today's day of week
    const today = new Date()
    return today.getDay()
  })

  // Ref for day selector scroll container
  const daySelectorRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(140)

  // Measure header height on mount and resize
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight
        setHeaderHeight(height)
        console.log('📏 Header height:', height)
      }
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)

    return () => window.removeEventListener('resize', updateHeaderHeight)
  }, [])

  // Fetch bookings for current week
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Calculate week range
        const weekStart = new Date(currentSunday)
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(currentSunday)
        weekEnd.setDate(weekEnd.getDate() + 7)
        weekEnd.setHours(0, 0, 0, 0)

        // Fetch bookings from API route (server-side)
        const response = await fetch('/api/bookings')
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch bookings')
        }

        const allBookings = data.bookings

        console.log('📅 Total bookings from API:', allBookings.length)
        console.log('📅 Week range:', { weekStart, weekEnd })

        // Parse and filter bookings
        const parsedBookings: BookingDisplay[] = allBookings
          .map((booking: any) => {
            const fields = booking.fields

            // Skip if no date
            if (!fields.Date) {
              return null
            }

            const bookingDate = new Date(fields.Date)
            console.log('📅 Checking booking:', {
              booking: fields.Booking,
              date: fields.Date,
              parsed: bookingDate.toISOString(),
              inWeek: bookingDate >= weekStart && bookingDate < weekEnd
            })

            // Filter to current week only
            if (bookingDate < weekStart || bookingDate >= weekEnd) {
              return null
            }

            // Try to get client name from multiple sources
            let clientName = 'Неизвестный клиент'
            if (fields['Name (from Client)'] && fields['Name (from Client)'].length > 0) {
              clientName = fields['Name (from Client)'][0]
            } else if (fields.Booking) {
              // Extract name from booking field if available (e.g., "Yulia (27): ...")
              const match = fields.Booking.match(/^([^(]+)/)
              if (match) {
                clientName = match[1].trim()
              }
            }

            return {
              id: booking.id,
              clientName,
              clientPhone: fields['Phone_Number']?.[0] || 'Не указан',
              date: fields.Date,
              procedures: fields['Name (from Procedures)'] || [],
              totalDuration: fields.Total_Duration || '0:00',
              totalPrice: fields.Total_Price || 0,
              bookingNumber: fields.Booking_Number_New || 0,
            }
          })
          .filter((booking: BookingDisplay | null): booking is BookingDisplay => booking !== null)

        console.log('📅 Filtered bookings for this week:', parsedBookings.length, parsedBookings)
        setBookings(parsedBookings)
      } catch (err) {
        console.error('Error fetching bookings:', err)
        setError('Не удалось загрузить записи')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [currentSunday])

  // Auto-scroll to selected day in mobile view
  useEffect(() => {
    if (daySelectorRef.current) {
      const container = daySelectorRef.current
      const buttons = container.querySelectorAll('button')
      const selectedButton = buttons[selectedDayIndex]

      if (selectedButton) {
        // Calculate scroll position to center the selected button
        const containerWidth = container.offsetWidth
        const buttonLeft = selectedButton.offsetLeft
        const buttonWidth = selectedButton.offsetWidth
        const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)

        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        })
      }
    }
  }, [selectedDayIndex])

  // Navigation handlers
  const handlePreviousWeek = () => {
    const newSunday = getPreviousWeek(currentSunday)
    setCurrentSunday(newSunday)

    // Check if today is in the new week
    const today = new Date()
    const newWeekDates = getWeekDates(newSunday)
    const todayInNewWeek = newWeekDates.findIndex(date => isToday(date))

    // If today is in the new week, select it; otherwise select Sunday (0)
    setSelectedDayIndex(todayInNewWeek !== -1 ? todayInNewWeek : 0)
  }

  const handleNextWeek = () => {
    const newSunday = getNextWeek(currentSunday)
    setCurrentSunday(newSunday)

    // Check if today is in the new week
    const today = new Date()
    const newWeekDates = getWeekDates(newSunday)
    const todayInNewWeek = newWeekDates.findIndex(date => isToday(date))

    // If today is in the new week, select it; otherwise select Sunday (0)
    setSelectedDayIndex(todayInNewWeek !== -1 ? todayInNewWeek : 0)
  }

  const handleToday = () => {
    const newSunday = getSunday(new Date())
    setCurrentSunday(newSunday)

    // Select today's day of week
    const today = new Date()
    setSelectedDayIndex(today.getDay())
  }

  // Parse duration string (e.g., "1:30" -> 90 minutes)
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':')
    const hours = parseInt(parts[0] || '0', 10)
    const minutes = parseInt(parts[1] || '0', 10)
    return hours * 60 + minutes
  }

  // Calculate booking height in pixels (64px per 30-minute slot)
  const calculateBookingHeight = (duration: string): number => {
    const totalMinutes = parseDuration(duration)
    const slots = totalMinutes / 30
    return slots * 64 // 64px = h-16
  }

  // Find booking for a specific time slot
  const findBookingForSlot = (date: Date, hour: number, minute: number): BookingDisplay | undefined => {
    return bookings.find((booking) => {
      const bookingDate = new Date(booking.date)
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear() &&
        bookingDate.getHours() === hour &&
        bookingDate.getMinutes() === minute
      )
    })
  }

  // Check if current slot is occupied by a booking that started earlier
  const isSlotOccupiedByEarlierBooking = (date: Date, hour: number, minute: number): boolean => {
    return bookings.some((booking) => {
      const bookingDate = new Date(booking.date)

      // Check if same day
      if (
        bookingDate.getDate() !== date.getDate() ||
        bookingDate.getMonth() !== date.getMonth() ||
        bookingDate.getFullYear() !== date.getFullYear()
      ) {
        return false
      }

      // Calculate booking end time
      const bookingStartMinutes = bookingDate.getHours() * 60 + bookingDate.getMinutes()
      const bookingDurationMinutes = parseDuration(booking.totalDuration)
      const bookingEndMinutes = bookingStartMinutes + bookingDurationMinutes
      const currentSlotMinutes = hour * 60 + minute

      // Check if current slot is within booking range (but not the start)
      return (
        currentSlotMinutes > bookingStartMinutes &&
        currentSlotMinutes < bookingEndMinutes
      )
    })
  }

  // Handle booking click
  const handleBookingClick = (booking: BookingDisplay) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header ref={headerRef} className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Календарь</h1>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Week Navigation */}
            <div className="flex gap-2 flex-1">
              <button
                onClick={handlePreviousWeek}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="hidden sm:inline">← Предыдущая неделя</span>
                <span className="sm:hidden">← Пред.</span>
              </button>
              <button
                onClick={handleNextWeek}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="hidden sm:inline">Следующая неделя →</span>
                <span className="sm:hidden">След. →</span>
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={handleToday}
              disabled={isCurrentWeek(currentSunday)}
              className={`px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                isCurrentWeek(currentSunday)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              Сегодня
            </button>
          </div>

          {/* Week Range Display */}
          <div className="mt-2 md:mt-3 text-xs md:text-sm text-gray-600">
            {formatDateLong(weekDates[0])} — {formatDateLong(weekDates[6])}
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">Загрузка записей...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Mobile Day Selector - Sticky (outside calendar container) */}
        <div className="md:hidden bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Scrollable mobile calendar container with fixed height */}
          <div className="h-[calc(100vh-180px)] overflow-y-auto">
            {/* Day Selector - Sticky at top of scrollable container */}
            <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-200 shadow-sm relative">
              {/* Left scroll indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>

              {/* Right scroll indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>

              {/* Scrollable day selector */}
              <div
                ref={daySelectorRef}
                className="overflow-x-auto scrollbar-hide"
              >
                <div className="flex">
                  {weekDates.map((date, index) => {
                    const today = isToday(date)
                    const isSelected = index === selectedDayIndex

                    // Count bookings for this day
                    const dayBookingsCount = bookings.filter(b => {
                      const bookingDate = new Date(b.date)
                      return (
                        bookingDate.getDate() === date.getDate() &&
                        bookingDate.getMonth() === date.getMonth() &&
                        bookingDate.getFullYear() === date.getFullYear()
                      )
                    }).length

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDayIndex(index)}
                        className={`flex-1 min-w-[75px] px-3 py-3 text-center border-r border-gray-200 last:border-r-0 transition-all relative ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg'
                            : today
                            ? 'bg-blue-100 text-blue-900 hover:bg-blue-200 active:bg-blue-300'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <div className="text-xs font-medium">
                          {DAYS_OF_WEEK_RU[index]}
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {date.getDate()}
                        </div>

                        {/* Booking indicator dot */}
                        {dayBookingsCount > 0 && (
                          <div className="absolute top-1 right-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'bg-white text-blue-600'
                                : 'bg-purple-600 text-white'
                            }`}>
                              {dayBookingsCount}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Single Day Time Slots */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((slot) => {
                // For mobile, show bookings for the selected day
                const selectedDate = weekDates[selectedDayIndex]
                const booking = findBookingForSlot(selectedDate, slot.hour, slot.minute)
                const isOccupied = isSlotOccupiedByEarlierBooking(selectedDate, slot.hour, slot.minute)

                return (
                  <div
                    key={slot.label}
                    className={`flex items-stretch transition-colors ${
                      booking || isOccupied ? '' : 'hover:bg-blue-50 active:bg-blue-100 cursor-pointer'
                    } ${isOccupied ? 'bg-gray-50' : ''}`}
                  >
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-3 py-4 text-sm font-medium text-gray-600 text-right">
                      {slot.label}
                    </div>

                    {/* Time Slot Content */}
                    <div className="flex-1 p-2 min-h-[60px] relative">
                      {booking ? (
                        <div
                          style={{
                            minHeight: `${Math.max(60, calculateBookingHeight(booking.totalDuration))}px`,
                          }}
                          className="h-full"
                        >
                          <BookingCard
                            clientName={booking.clientName}
                            procedures={booking.procedures}
                            totalDuration={booking.totalDuration}
                            onClick={() => handleBookingClick(booking)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block">
            {/* Scrollable calendar container with fixed height */}
            <div className="h-[calc(100vh-300px)] overflow-y-auto">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 z-20 bg-white shadow-sm">
                  <tr>
                    {/* Empty cell for time column */}
                    <th className="bg-white border-b-2 border-r border-gray-200 w-20"></th>
                    {/* Day headers */}
                    {weekDates.map((date, index) => {
                      const today = isToday(date)
                      return (
                        <th
                          key={date.toISOString()}
                          className={`border-b-2 border-gray-200 px-2 py-3 text-center min-w-[120px] ${
                            today ? 'bg-blue-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-700">
                            {DAYS_OF_WEEK_RU[index]}
                          </div>
                          <div
                            className={`text-lg font-bold mt-1 ${
                              today ? 'text-blue-600' : 'text-gray-900'
                            }`}
                          >
                            {formatDate(date)}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot.label}>
                      {/* Time Label */}
                      <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 text-right">
                        {slot.label}
                      </td>

                      {/* Time Slots for Each Day */}
                      {weekDates.map((date) => {
                        const today = isToday(date)
                        const booking = findBookingForSlot(date, slot.hour, slot.minute)
                        const isOccupied = isSlotOccupiedByEarlierBooking(date, slot.hour, slot.minute)

                        return (
                          <td
                            key={`${date.toISOString()}-${slot.label}`}
                            className={`border-b border-r border-gray-200 p-1 h-16 transition-colors relative ${
                              booking || isOccupied ? '' : 'hover:bg-blue-50 cursor-pointer'
                            } ${today ? 'bg-blue-25' : 'bg-white'} ${
                              isOccupied ? 'bg-gray-100' : ''
                            }`}
                          >
                            {booking ? (
                              <div
                                style={{
                                  height: `${calculateBookingHeight(booking.totalDuration)}px`,
                                }}
                                className="absolute top-1 left-1 right-1 z-10"
                              >
                                <BookingCard
                                  clientName={booking.clientName}
                                  procedures={booking.procedures}
                                  totalDuration={booking.totalDuration}
                                  onClick={() => handleBookingClick(booking)}
                                />
                              </div>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Empty State Message */}
        <div className="mt-4 md:mt-6 text-center text-gray-500 text-xs md:text-sm px-4">
          <p className="hidden md:block">Нажмите на свободный временной слот, чтобы создать запись</p>
          <p className="md:hidden">
            {weekDates[selectedDayIndex] && (
              <>
                {formatDateLong(weekDates[selectedDayIndex])}
                {bookings.filter(b => {
                  const bookingDate = new Date(b.date)
                  const selectedDate = weekDates[selectedDayIndex]
                  return (
                    bookingDate.getDate() === selectedDate.getDate() &&
                    bookingDate.getMonth() === selectedDate.getMonth() &&
                    bookingDate.getFullYear() === selectedDate.getFullYear()
                  )
                }).length === 0 && (
                  <span className="block mt-2 text-gray-400">
                    Нет записей на этот день
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </main>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        booking={
          selectedBooking
            ? {
                clientName: selectedBooking.clientName,
                clientPhone: selectedBooking.clientPhone,
                date: selectedBooking.date,
                procedures: selectedBooking.procedures,
                totalDuration: selectedBooking.totalDuration,
                totalPrice: selectedBooking.totalPrice,
              }
            : null
        }
      />
    </div>
  )
}
