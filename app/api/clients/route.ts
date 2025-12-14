import { NextResponse } from 'next/server'
import { getClients } from '@/lib/airtable/client'

export async function GET(request: Request) {
  try {
    // Fetch all clients from Airtable
    const clients = await getClients()

    return NextResponse.json({
      success: true,
      clients,
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clients',
      },
      { status: 500 }
    )
  }
}
