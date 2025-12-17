import { NextResponse } from 'next/server'
import { updateBooking, deleteBooking, getBooking } from '@/lib/airtable/client'
import type { UpdateBookingData } from '@/types/airtable'

// GET /api/bookings/[id] - Get a single booking
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await getBooking(params.id)

    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch booking',
      },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update a booking
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { clientId, procedureIds, date, customDuration } = body

    // Validate input
    if (!clientId || !procedureIds || !Array.isArray(procedureIds) || procedureIds.length === 0 || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Отсутствуют обязательные поля: clientId, procedureIds, date',
        },
        { status: 400 }
      )
    }

    // Create update data for Airtable
    const updateData: UpdateBookingData = {
      Client: [clientId],
      Procedures: procedureIds,
      Date: date,
    }

    // Add custom duration if provided (in seconds)
    if (customDuration && typeof customDuration === 'number') {
      updateData.Duration_Castomed = customDuration
    }

    // Update booking in Airtable
    const booking = await updateBooking(params.id, updateData)

    return NextResponse.json({
      success: true,
      booking,
    })
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось обновить запись',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Delete a booking
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await deleteBooking(params.id)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось удалить запись',
      },
      { status: 500 }
    )
  }
}
