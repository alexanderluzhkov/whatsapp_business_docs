// Date utility functions for calendar

export interface TimeSlot {
  hour: number
  minute: number
  label: string
}

export const DAYS_OF_WEEK_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const DAYS_OF_WEEK_FULL_RU = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]

export const WORKING_HOURS = {
  start: 8,
  end: 21,
}

export const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export const SLOT_DURATION_MINUTES = 30

/**
 * Get Sunday of the week for a given date (Israel timezone - week starts Sunday)
 */
export function getSunday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day // Sunday is 0, so subtract day number to get to Sunday
  return new Date(d.setDate(diff))
}

/**
 * Get array of dates for the week starting from Sunday
 */
export function getWeekDates(sunday: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
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
export function isCurrentWeek(sunday: Date): boolean {
  const today = new Date()
  const currentSunday = getSunday(today)
  return isSameDay(sunday, currentSunday)
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
export function getPreviousWeek(currentSunday: Date): Date {
  const newDate = new Date(currentSunday)
  newDate.setDate(newDate.getDate() - 7)
  return newDate
}

/**
 * Navigate to next week
 */
export function getNextWeek(currentSunday: Date): Date {
  const newDate = new Date(currentSunday)
  newDate.setDate(newDate.getDate() + 7)
  return newDate
}

/**
 * Get name of the month in Russian
 */
export function getMonthName(date: Date): string {
  return MONTHS_RU[date.getMonth()]
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - 1)
  return d
}

/**
 * Navigate to next month
 */
export function getNextMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  return d
}

/**
 * Get all days for a month view grid (including padding from adjacent months)
 */
export function getMonthViewDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()

  // First day of the month
  const firstDayOfMonth = new Date(year, month, 1)
  // Last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDayOfMonth)
  const dayOfWeek = firstDayOfMonth.getDay()
  startDate.setDate(startDate.getDate() - dayOfWeek)

  // End at the Saturday of the week containing the last day
  const endDate = new Date(lastDayOfMonth)
  const lastDayOfWeek = lastDayOfMonth.getDay()
  endDate.setDate(endDate.getDate() + (6 - lastDayOfWeek))

  const days: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Ensure we have exactly 42 days (6 weeks) for a consistent grid if requested, 
  // but for now, we'll just return the full weeks.
  return days
}

/**
 * Check if a date is in the same month as another date
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  )
}
