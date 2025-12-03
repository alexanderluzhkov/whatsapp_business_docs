import {
  AirtableResponse,
  AirtableRecord,
  Client,
  ClientFields,
  Procedure,
  ProcedureFields,
  Booking,
  BookingFields,
  CreateBookingData,
  UpdateBookingData,
} from '@/types/airtable'
import { AIRTABLE_CONFIG, getTableUrl, getRecordUrl } from './config'

// Generic fetch function for Airtable API
async function airtableFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Airtable API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    )
  }

  return response.json()
}

// ========== CLIENTS ==========

export async function getClients(): Promise<Client[]> {
  const url = getTableUrl(AIRTABLE_CONFIG.tables.clients)
  const response = await airtableFetch<AirtableResponse<ClientFields>>(url)
  return response.records
}

export async function getClient(recordId: string): Promise<Client> {
  const url = getRecordUrl(AIRTABLE_CONFIG.tables.clients, recordId)
  return airtableFetch<Client>(url)
}

// ========== PROCEDURES ==========

export async function getProcedures(): Promise<Procedure[]> {
  const url = `${getTableUrl(AIRTABLE_CONFIG.tables.procedures)}?filterByFormula={Active}=TRUE()`
  const response = await airtableFetch<AirtableResponse<ProcedureFields>>(url)
  return response.records
}

export async function getAllProcedures(): Promise<Procedure[]> {
  const url = getTableUrl(AIRTABLE_CONFIG.tables.procedures)
  const response = await airtableFetch<AirtableResponse<ProcedureFields>>(url)
  return response.records
}

export async function getProcedure(recordId: string): Promise<Procedure> {
  const url = getRecordUrl(AIRTABLE_CONFIG.tables.procedures, recordId)
  return airtableFetch<Procedure>(url)
}

// ========== BOOKINGS ==========

export async function getBookings(
  startDate?: string,
  endDate?: string
): Promise<Booking[]> {
  let url = getTableUrl(AIRTABLE_CONFIG.tables.bookings)

  // Add date filter if provided
  if (startDate && endDate) {
    const filter = `AND(IS_AFTER({Date}, '${startDate}'), IS_BEFORE({Date}, '${endDate}'))`
    url += `?filterByFormula=${encodeURIComponent(filter)}`
  }

  const response = await airtableFetch<AirtableResponse<BookingFields>>(url)
  return response.records
}

export async function getBooking(recordId: string): Promise<Booking> {
  const url = getRecordUrl(AIRTABLE_CONFIG.tables.bookings, recordId)
  return airtableFetch<Booking>(url)
}

export async function createBooking(
  data: CreateBookingData
): Promise<Booking> {
  const url = getTableUrl(AIRTABLE_CONFIG.tables.bookings)
  return airtableFetch<Booking>(url, {
    method: 'POST',
    body: JSON.stringify({ fields: data }),
  })
}

export async function updateBooking(
  recordId: string,
  data: UpdateBookingData
): Promise<Booking> {
  const url = getRecordUrl(AIRTABLE_CONFIG.tables.bookings, recordId)
  return airtableFetch<Booking>(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields: data }),
  })
}

export async function deleteBooking(recordId: string): Promise<{ deleted: boolean; id: string }> {
  const url = getRecordUrl(AIRTABLE_CONFIG.tables.bookings, recordId)
  return airtableFetch<{ deleted: boolean; id: string }>(url, {
    method: 'DELETE',
  })
}
