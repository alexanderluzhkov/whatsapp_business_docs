import { NextResponse } from 'next/server'
import { getBookings } from '@/lib/airtable/client'

export async function GET(request: Request) {
  try {
    // Fetch bookings from Airtable
    const bookings = await getBookings()

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
