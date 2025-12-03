import { NextResponse } from 'next/server'
import { getClients, getProcedures, getBookings } from '@/lib/airtable'

export async function GET() {
  try {
    // Test fetching clients
    const clients = await getClients()

    // Test fetching procedures
    const procedures = await getProcedures()

    // Test fetching bookings
    const bookings = await getBookings()

    return NextResponse.json({
      success: true,
      message: 'Airtable connection successful',
      data: {
        clients: {
          count: clients.length,
          sample: clients[0] || null,
        },
        procedures: {
          count: procedures.length,
          sample: procedures[0] || null,
        },
        bookings: {
          count: bookings.length,
          sample: bookings[0] || null,
        },
      },
    })
  } catch (error) {
    console.error('Airtable connection error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
