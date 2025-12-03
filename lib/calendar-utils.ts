// Date utility functions for calendar

export interface TimeSlot {
  hour: number
  minute: number
  label: string
}

export const DAYS_OF_WEEK_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const DAYS_OF_WEEK_FULL_RU = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

export const WORKING_HOURS = {
  start: 9,
  end: 20,
}

export const SLOT_DURATION_MINUTES = 30

/**
 * Get Monday of the week for a given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

/**
 * Get array of dates for the week starting from Monday
 */
export function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  return dates
}

/**
 * Format date as "DD.MM"
 */
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}.${month}`
}

/**
 * Format date as "DD MMMM" in Russian
 */
export function formatDateLong(date: Date): string {
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]
  return `${date.getDate()} ${months[date.getMonth()]}`
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Check if a date is in the current week
 */
export function isCurrentWeek(monday: Date): boolean {
  const today = new Date()
  const currentMonday = getMonday(today)
  return isSameDay(monday, currentMonday)
}

/**
 * Generate time slots for the working day
 */
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  const { start, end } = WORKING_HOURS

  for (let hour = start; hour < end; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
      slots.push({
        hour,
        minute,
        label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      })
    }
  }

  return slots
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(currentMonday: Date): Date {
  const newDate = new Date(currentMonday)
  newDate.setDate(newDate.getDate() - 7)
  return newDate
}

/**
 * Navigate to next week
 */
export function getNextWeek(currentMonday: Date): Date {
  const newDate = new Date(currentMonday)
  newDate.setDate(newDate.getDate() + 7)
  return newDate
}
