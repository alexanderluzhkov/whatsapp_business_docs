// Airtable configuration
export const AIRTABLE_CONFIG = {
  apiKey: process.env.AIRTABLE_API_KEY!,
  baseId: process.env.AIRTABLE_BASE_ID!,
  tables: {
    clients: process.env.AIRTABLE_CLIENTS_TABLE_ID!,
    procedures: process.env.AIRTABLE_PROCEDURES_TABLE_ID!,
    bookings: process.env.AIRTABLE_BOOKINGS_TABLE_ID!,
  },
}

export const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

// Helper to get full table URL
export function getTableUrl(tableId: string): string {
  return `${AIRTABLE_API_URL}/${AIRTABLE_CONFIG.baseId}/${tableId}`
}

// Helper to get record URL
export function getRecordUrl(tableId: string, recordId: string): string {
  return `${getTableUrl(tableId)}/${recordId}`
}
