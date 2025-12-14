import { NextResponse } from 'next/server'
import { getProcedures } from '@/lib/airtable/client'

export async function GET(request: Request) {
  try {
    // Fetch active procedures from Airtable (filtered by Active=true)
    const procedures = await getProcedures()

    return NextResponse.json({
      success: true,
      procedures,
    })
  } catch (error) {
    console.error('Error fetching procedures:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch procedures',
      },
      { status: 500 }
    )
  }
}
