'use client'

import { useState } from 'react'
import {
  getMonday,
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

export default function CalendarPage() {
  // State for current week (Monday)
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()))

  // Get dates for the current week
  const weekDates = getWeekDates(currentMonday)
  const timeSlots = generateTimeSlots()

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentMonday(getPreviousWeek(currentMonday))
  }

  const handleNextWeek = () => {
    setCurrentMonday(getNextWeek(currentMonday))
  }

  const handleToday = () => {
    setCurrentMonday(getMonday(new Date()))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
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
              disabled={isCurrentWeek(currentMonday)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrentWeek(currentMonday)
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-collapse">
                {/* Table Header - Days */}
                <thead>
                  <tr>
                    {/* Empty cell for time column */}
                    <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 w-20"></th>
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

                {/* Table Body - Time Slots */}
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
                        return (
                          <td
                            key={`${date.toISOString()}-${slot.label}`}
                            className={`border-b border-r border-gray-200 p-1 h-16 hover:bg-blue-50 cursor-pointer transition-colors ${
                              today ? 'bg-blue-25' : 'bg-white'
                            }`}
                          >
                            {/* Empty slot - ready for bookings */}
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
              {timeSlots.map((slot) => (
                <div
                  key={slot.label}
                  className="flex items-stretch hover:bg-blue-50 active:bg-blue-100 cursor-pointer transition-colors"
                >
                  {/* Time Label */}
                  <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-3 py-4 text-sm font-medium text-gray-600 text-right">
                    {slot.label}
                  </div>

                  {/* Time Slot Content */}
                  <div className="flex-1 p-4 min-h-[60px]">
                    {/* Empty slot - ready for bookings */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty State Message */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Нажмите на свободный временной слот, чтобы создать запись</p>
        </div>
      </main>
    </div>
  )
}
