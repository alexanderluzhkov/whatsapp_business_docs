'use client'

import { useState, useEffect } from 'react'
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

        // Parse and filter bookings
        const parsedBookings: BookingDisplay[] = allBookings
          .map((booking: any) => {
            const fields = booking.fields

            // Skip if no client name
            if (!fields['Name (from Client)'] || fields['Name (from Client)'].length === 0) {
              return null
            }

            // Skip if no date
            if (!fields.Date) {
              return null
            }

            const bookingDate = new Date(fields.Date)

            // Filter to current week only
            if (bookingDate < weekStart || bookingDate >= weekEnd) {
              return null
            }

            return {
              id: booking.id,
              clientName: fields['Name (from Client)'][0],
              clientPhone: fields['Phone_Number']?.[0] || 'Не указан',
              date: fields.Date,
              procedures: fields['Name (from Procedures)'] || [],
              totalDuration: fields.Total_Duration || '0:00',
              totalPrice: fields.Total_Price || 0,
              bookingNumber: fields.Booking_Number_New || 0,
            }
          })
          .filter((booking): booking is BookingDisplay => booking !== null)

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

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentSunday(getPreviousWeek(currentSunday))
  }

  const handleNextWeek = () => {
    setCurrentSunday(getNextWeek(currentSunday))
  }

  const handleToday = () => {
    setCurrentSunday(getSunday(new Date()))
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
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Календарь</h1>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Week Navigation */}
            <div className="flex gap-2 flex-1">
              <button
                onClick={handlePreviousWeek}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                ← Предыдущая неделя
              </button>
              <button
                onClick={handleNextWeek}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Следующая неделя →
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={handleToday}
              disabled={isCurrentWeek(currentSunday)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrentWeek(currentSunday)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              Сегодня
            </button>
          </div>

          {/* Week Range Display */}
          <div className="mt-3 text-sm text-gray-600">
            {formatDateLong(weekDates[0])} — {formatDateLong(weekDates[6])}
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
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

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block">
            {/* Sticky Table Header - Separate from table */}
            <div className="sticky top-[145px] z-20 bg-white overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="flex border-b-2 border-gray-200">
                  {/* Empty cell for time column */}
                  <div className="sticky left-0 z-20 bg-white border-r border-gray-200 w-20 flex-shrink-0"></div>
                  {/* Day headers */}
                  {weekDates.map((date, index) => {
                    const today = isToday(date)
                    return (
                      <div
                        key={date.toISOString()}
                        className={`px-2 py-3 text-center min-w-[120px] flex-1 ${
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
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Table Body - Time Slots */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full border-collapse">
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

                        return (
                          <td
                            key={`${date.toISOString()}-${slot.label}`}
                            className={`border-b border-r border-gray-200 p-1 h-16 transition-colors ${
                              booking ? '' : 'hover:bg-blue-50 cursor-pointer'
                            } ${today ? 'bg-blue-25' : 'bg-white'}`}
                          >
                            {booking ? (
                              <BookingCard
                                clientName={booking.clientName}
                                procedures={booking.procedures}
                                totalDuration={booking.totalDuration}
                                onClick={() => handleBookingClick(booking)}
                              />
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

          {/* Mobile View - Day Selector + Single Day Grid */}
          <div className="md:hidden">
            {/* Day Selector */}
            <div className="overflow-x-auto border-b border-gray-200">
              <div className="flex">
                {weekDates.map((date, index) => {
                  const today = isToday(date)
                  return (
                    <button
                      key={date.toISOString()}
                      className={`flex-1 min-w-[70px] px-3 py-3 text-center border-r border-gray-200 last:border-r-0 transition-colors ${
                        today
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xs font-medium">
                        {DAYS_OF_WEEK_RU[index]}
                      </div>
                      <div className="text-lg font-bold mt-1">
                        {date.getDate()}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Single Day Time Slots */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((slot) => {
                // For mobile, show today's bookings
                const today = new Date()
                const booking = findBookingForSlot(today, slot.hour, slot.minute)

                return (
                  <div
                    key={slot.label}
                    className={`flex items-stretch transition-colors ${
                      booking ? '' : 'hover:bg-blue-50 active:bg-blue-100 cursor-pointer'
                    }`}
                  >
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-3 py-4 text-sm font-medium text-gray-600 text-right">
                      {slot.label}
                    </div>

                    {/* Time Slot Content */}
                    <div className="flex-1 p-2 min-h-[60px]">
                      {booking ? (
                        <BookingCard
                          clientName={booking.clientName}
                          procedures={booking.procedures}
                          totalDuration={booking.totalDuration}
                          onClick={() => handleBookingClick(booking)}
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Empty State Message */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Нажмите на свободный временной слот, чтобы создать запись</p>
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
