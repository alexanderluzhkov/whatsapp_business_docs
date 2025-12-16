// Airtable API Response Types
export interface AirtableRecord<T> {
  id: string
  createdTime: string
  fields: T
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}

// Client Table
export interface ClientFields {
  Client_id?: number
  'First Name'?: string
  'Last Name'?: string
  Phone_Number?: string
  Birthday_Date?: string
}

export type Client = AirtableRecord<ClientFields>

// Procedure Table
export interface ProcedureFields {
  Name: string
  Duration?: number // in seconds
  Price?: number
  Active?: boolean
}

export type Procedure = AirtableRecord<ProcedureFields>

// Booking Table
export interface BookingFields {
  Booking_Number_New?: number
  Client?: string[] // Array of record IDs (link to Clients)
  Procedures?: string[] // Array of record IDs (link to Procedures)
  Date?: string // ISO 8601 datetime string
  Total_Duration?: number // formula field, in seconds
  Total_Price?: number // formula field
  Token_Used?: boolean
}

export type Booking = AirtableRecord<BookingFields>

// Expanded types with full data (for frontend use)
export interface ClientData {
  id: string
  clientId: number
  firstName: string
  lastName: string
  phoneNumber: string
  birthdayDate?: string
}

export interface ProcedureData {
  id: string
  name: string
  duration: number // in minutes for frontend
  price: number
  active: boolean
}

export interface BookingData {
  id: string
  bookingNumber: number
  client: ClientData | null
  procedures: ProcedureData[]
  date: Date
  totalDuration: number // in minutes
  totalPrice: number
  tokenUsed: boolean
}

// Create/Update types (without computed fields)
export interface CreateBookingData {
  Client: string[] // Array with single client record ID
  Procedures: string[] // Array of procedure record IDs
  Date: string // ISO 8601 datetime string
  Token_Used?: boolean
}

export interface UpdateBookingData {
  Client?: string[]
  Procedures?: string[]
  Date?: string
  Token_Used?: boolean
}

// Booking data as returned from Airtable with lookup fields
export interface BookingFromAirtable {
  id: string
  fields: {
    Date?: string // ISO datetime
    'Name (from Client)'?: string[] // Array with client names from lookup
    'Name (from Procedures)'?: string[] // Array with procedure names from lookup
    Total_Duration?: string // "1:30" format
    Duration_Castomed?: number // Custom duration in seconds - set by nail master
    Total_Price?: number
    Phone_Number?: string[] // Lookup field from Client table
    Booking_Number_New?: number
    Booking?: string // Full booking text
  }
}

// Parsed booking data for display
export interface BookingDisplay {
  id: string
  clientName: string
  clientPhone: string
  date: string // ISO datetime
  procedures: string[]
  totalDuration: string
  totalPrice: number
  bookingNumber: number
}
