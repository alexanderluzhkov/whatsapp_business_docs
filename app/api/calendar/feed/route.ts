import { NextResponse } from 'next/server'
import { getBookings, getClients, getAllProcedures } from '@/lib/airtable/client'
import type { Booking, Client, Procedure } from '@/types/airtable'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        // Simple token check (can be improved)
        if (!token || token !== 'nail-master-personal-sync') {
            return new Response('Unauthorized', { status: 401 })
        }

        // Fetch data from Airtable
        // Fetch a 4-month window (1 month back, 3 months forward)
        const now = new Date()
        const startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        const endDate = new Date(now)
        endDate.setMonth(now.getMonth() + 3)

        const [bookings, clients, procedures] = await Promise.all([
            getBookings(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
            getClients(),
            getAllProcedures(),
        ])

        // Helper functions for iCal formatting
        const formatDateICS = (dateStr: string) => {
            return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        }

        const escapeICS = (str: string) => {
            return str.replace(/[,;\\]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')
        }

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Nail Master//Booking Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Nail Master Bookings',
            'X-WR-TIMEZONE:Asia/Jerusalem',
        ].join('\r\n') + '\r\n'

        bookings.forEach((booking: Booking) => {
            const { fields, id } = booking
            const isMeTime = fields.Is_Me_Time === true
            const date = fields.Date || ''
            const durationSeconds = fields.Total_Duration || 3600 // Default 1h

            const startTime = new Date(date)
            const endTime = new Date(startTime.getTime() + durationSeconds * 1000)

            let summary = ''
            let description = ''

            if (isMeTime) {
                summary = `🧘 ${fields.Me_Time_Title || 'Личное время'}`
                description = 'Личное время (заблокировано)'
            } else {
                const client = clients.find(c => c.id === fields.Client?.[0])
                const clientName = client ? `${client.fields['First Name']} ${client.fields['Last Name'] || ''}`.trim() : 'Клиент'
                const clientPhone = client?.fields.Phone_Number || ''

                const bookingProcedures = (fields.Procedures || [])
                    .map(id => procedures.find(p => p.id === id)?.fields.Name)
                    .filter(Boolean)
                    .join(', ')

                summary = `💅 ${clientName} (${bookingProcedures})`
                description = `Клиент: ${clientName}\\nТелефон: ${clientPhone}\\nПроцедуры: ${bookingProcedures}\\nЦена: ₪${fields.Total_Price || 0}`
            }

            icsContent += [
                'BEGIN:VEVENT',
                `UID:${id}@nailmaster.vercel.app`,
                `DTSTAMP:${formatDateICS(new Date().toISOString())}`,
                `DTSTART:${formatDateICS(startTime.toISOString())}`,
                `DTEND:${formatDateICS(endTime.toISOString())}`,
                `SUMMARY:${escapeICS(summary)}`,
                `DESCRIPTION:${escapeICS(description)}`,
                'END:VEVENT',
            ].join('\r\n') + '\r\n'
        })

        icsContent += 'END:VCALENDAR'

        return new Response(icsContent, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="bookings.ics"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        })
    } catch (error) {
        console.error('Error generating iCal feed:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
