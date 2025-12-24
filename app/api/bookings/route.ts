import { NextResponse } from 'next/server'
import { getBookings, createBooking } from '@/lib/airtable/client'
import type { CreateBookingData } from '@/types/airtable'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch bookings from Airtable
    const bookings = await getBookings(startDate || undefined, endDate || undefined)

    return NextResponse.json({
      success: true,
      bookings,
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bookings',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, procedureIds, date, customDuration, isMeTime, meTimeTitle } = body

    // Validate input (skip clientId/procedureIds if it's Me Time)
    if (!isMeTime && (!clientId || !procedureIds || !Array.isArray(procedureIds) || procedureIds.length === 0 || !date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Отсутствуют обязательные поля: clientId, procedureIds, date',
        },
        { status: 400 }
      )
    }

    if (isMeTime && !date) {
      return NextResponse.json({ success: false, error: 'Дата обязательна' }, { status: 400 })
    }

    // Create booking data for Airtable
    const bookingData: CreateBookingData = {
      Date: date,
    }

    if (!isMeTime) {
      bookingData.Client = [clientId]
      bookingData.Procedures = procedureIds
    }

    // Add custom duration if provided (in seconds)
    if (customDuration && typeof customDuration === 'number') {
      bookingData.Duration_Castomed = customDuration
    }

    // Add Me Time fields
    if (typeof isMeTime === 'boolean') {
      bookingData.Is_Me_Time = isMeTime
      bookingData.Me_Time_Title = meTimeTitle || 'Личное время'
    }

    // Create booking in Airtable
    const booking = await createBooking(bookingData)

    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось создать запись',
      },
      { status: 500 }
    )
  }
}
