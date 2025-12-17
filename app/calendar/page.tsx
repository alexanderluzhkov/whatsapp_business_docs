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
  isSameDay,
  DAYS_OF_WEEK_RU,
} from '@/lib/calendar-utils'
import type { BookingFromAirtable, BookingDisplay } from '@/types/airtable'
import BookingCard from '@/components/BookingCard'
import BookingDetailsModal from '@/components/BookingDetailsModal'
import BookingForm from '@/components/BookingForm'

export default function CalendarPage() {
  // State for current week (Sunday - Israel timezone)
  const [currentSunday, setCurrentSunday] = useState(() => getSunday(new Date()))

  // Get dates for the current week
  const weekDates = getWeekDates(currentSunday)
  const timeSlots = generateTimeSlots()

  // Booking state
  const [bookings, setBookings] = useState<BookingDisplay[]>([])
  const [rawBookings, setRawBookings] = useState<any[]>([]) // Store raw Airtable data
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingDisplay | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Booking form state
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null)
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false)
  const [editBookingData, setEditBookingData] = useState<{
    id: string
    clientId: string
    procedureIds: string[]
    customDuration?: number // in minutes
  } | null>(null)

  // Mobile state - default to today
  const [selectedMobileDate, setSelectedMobileDate] = useState(() => new Date())

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

        // Store raw bookings for edit mode
        setRawBookings(allBookings)

        // Parse and filter bookings
        const parsedBookings: BookingDisplay[] = allBookings
          .map((booking: any) => {
            const fields = booking.fields

            // Skip if no date
            if (!fields.Date) {
              return null
            }

            const bookingDate = new Date(fields.Date)

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

            // Get duration - prefer custom duration over calculated
            let totalDuration = '0:00'
            if (fields.Duration_Castomed) {
              // Convert seconds to H:MM format
              const totalSeconds = fields.Duration_Castomed
              const hours = Math.floor(totalSeconds / 3600)
              const minutes = Math.floor((totalSeconds % 3600) / 60)
              totalDuration = `${hours}:${minutes.toString().padStart(2, '0')}`
            } else if (fields.Total_Duration) {
              totalDuration = fields.Total_Duration
            }

            return {
              id: booking.id,
              clientName,
              clientPhone: fields['Phone_Number']?.[0] || 'Не указан',
              date: fields.Date,
              procedures: fields['Name (from Procedures)'] || [],
              totalDuration,
              totalPrice: fields.Total_Price || 0,
              bookingNumber: fields.Booking_Number_New || 0,
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

  // Handle empty slot click
  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    setSelectedSlot({ date, time: timeLabel })
    setIsBookingFormOpen(true)
  }

  // Handle booking creation
  const handleBookingCreated = () => {
    // Refresh bookings by re-triggering the useEffect
    setCurrentSunday(new Date(currentSunday))
  }

  // Close booking form
  const handleCloseBookingForm = () => {
    setIsBookingFormOpen(false)
    setSelectedSlot(null)
    setEditBookingData(null)
  }

  // Handle edit booking
  const handleEditBooking = () => {
    if (!selectedBooking) return

    // Find the raw booking data
    const rawBooking = rawBookings.find((b) => b.id === selectedBooking.id)
    if (!rawBooking) {
      console.error('Raw booking data not found')
      return
    }

    // Extract client ID and procedure IDs
    const clientId = rawBooking.fields.Client?.[0]
    const procedureIds = rawBooking.fields.Procedures || []

    if (!clientId) {
      console.error('Missing client in booking data')
      return
    }

    // Extract custom duration if it exists (convert seconds to minutes)
    let customDuration: number | undefined
    if (rawBooking.fields.Duration_Castomed) {
      customDuration = Math.floor(rawBooking.fields.Duration_Castomed / 60)
    }

    // Parse date and time from the booking
    const bookingDate = new Date(selectedBooking.date)
    const timeLabel = `${bookingDate.getHours().toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')}`

    // Set edit mode data
    setEditBookingData({
      id: selectedBooking.id,
      clientId,
      procedureIds,
      customDuration,
    })
    setSelectedSlot({ date: bookingDate, time: timeLabel })
    setIsBookingFormOpen(true)
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm flex-none z-50">
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
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${isCurrentWeek(currentSunday)
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
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto px-4 py-6 w-full">
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
                          className={`border-b-2 border-gray-200 px-2 py-3 text-center min-w-[120px] relative ${today ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                        >
                          <div className="font-semibold text-sm text-gray-700">
                            {DAYS_OF_WEEK_RU[index]}
                          </div>
                          <div
                            className={`text - lg font - bold mt - 1 ${today ? 'text-blue-600' : 'text-gray-900'
                              }`}
                          >
                            {formatDate(date)}
                          </div>
                          {/* Booking Count Badge */}
                          {(() => {
                            const dailyBookings = bookings.filter(b => isSameDay(new Date(b.date), date))
                            if (dailyBookings.length > 0) {
                              return (
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                  {dailyBookings.length}
                                </div>
                              )
                            }
                            return null
                          })()}
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
                            key={`${date.toISOString()} - ${slot.label}`}
                            className={`border - b border - r border - gray - 200 p - 1 h - 16 transition - colors relative ${booking || isOccupied ? '' : 'hover:bg-blue-50 cursor-pointer'
                              } ${today ? 'bg-blue-25' : 'bg-white'} ${isOccupied ? 'bg-gray-100' : ''
                              }`}
                            onClick={() => {
                              if (!booking && !isOccupied) {
                                handleSlotClick(date, slot.hour, slot.minute)
                              }
                            }}
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

          {/* Mobile View - Day Selector + Single Day Grid */}
          <div className="md:hidden">
            {/* Day Selector */}
            <div className="sticky top-0 z-30 bg-white overflow-x-auto border-b border-gray-200">
              <div className="flex">
                {weekDates.map((date, index) => {
                  const today = isToday(date)
                  const isSelected = isSameDay(date, selectedMobileDate)
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedMobileDate(date)}
                      className={`flex-1 min-w-[70px] px-3 py-3 text-center border-r border-gray-200 last:border-r-0 transition-colors relative ${isSelected
                        ? 'bg-blue-600 text-white'
                        : today
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div className="text-xs font-medium">
                        {DAYS_OF_WEEK_RU[index]}
                      </div>
                      <div className="text-lg font-bold mt-1">
                        {date.getDate()}
                      </div>
                      {/* Mobile Booking Count Badge */}
                      {(() => {
                        const dailyBookings = bookings.filter(b => isSameDay(new Date(b.date), date))
                        if (dailyBookings.length > 0) {
                          return (
                            <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                              {dailyBookings.length}
                            </div>
                          )
                        }
                        return null
                      })()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Single Day Time Slots */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((slot) => {
                const booking = findBookingForSlot(selectedMobileDate, slot.hour, slot.minute)
                const isOccupied = isSlotOccupiedByEarlierBooking(selectedMobileDate, slot.hour, slot.minute)

                return (
                  <div
                    key={slot.label}
                    className={`flex items-stretch transition-colors min-h-[64px] h-16 ${booking || isOccupied ? '' : 'hover:bg-blue-50 active:bg-blue-100 cursor-pointer'
                      } ${isOccupied ? 'bg-gray-100' : 'bg-white'}`}
                    onClick={() => {
                      if (!booking && !isOccupied) {
                        handleSlotClick(selectedMobileDate, slot.hour, slot.minute)
                      }
                    }}
                  >
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 text-right flex items-center justify-end">
                      {slot.label}
                    </div>

                    {/* Time Slot Content */}
                    <div className="flex-1 p-1 relative">
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
      </main >

      {/* Booking Details Modal */}
      < BookingDetailsModal
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
        onEdit={handleEditBooking}
      />

      {/* Booking Form */}
      {
        selectedSlot && (
          <BookingForm
            isOpen={isBookingFormOpen}
            onClose={handleCloseBookingForm}
            selectedDate={selectedSlot.date}
            selectedTime={selectedSlot.time}
            onBookingCreated={handleBookingCreated}
            existingBookings={bookings}
            editMode={!!editBookingData}
            bookingId={editBookingData?.id}
            initialClientId={editBookingData?.clientId}
            initialProcedureIds={editBookingData?.procedureIds}
            initialCustomDuration={editBookingData?.customDuration}
          />
        )
      }
    </div >
  )
}
