import { NextResponse } from 'next/server'
import { getClients, createClient } from '@/lib/airtable/client'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, phoneNumber } = body

    if (!firstName || !phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Имя и номер телефона обязательны',
        },
        { status: 400 }
      )
    }

    const client = await createClient({
      'First Name': firstName,
      'Last Name': lastName || '',
      Phone_Number: phoneNumber,
    })

    return NextResponse.json({
      success: true,
      client,
    })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось создать клиента',
      },
      { status: 500 }
    )
  }
}
