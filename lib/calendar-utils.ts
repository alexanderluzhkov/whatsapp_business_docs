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
  start: 9,
  end: 20,
}

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
