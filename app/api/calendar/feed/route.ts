import { NextResponse } from 'next/server'
import { getBookings, getClients, getAllProcedures } from '@/lib/airtable/client'
import type { Booking, Client, Procedure } from '@/types/airtable'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        // Simple token check
        if (!token || token !== 'nail-master-personal-sync') {
            return new Response('Unauthorized', { status: 401 })
        }

        // Fast path for HEAD requests (often used for verification)
        if (request.method === 'HEAD') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="bookings.ics"',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'X-PUBLISHED-TTL': 'PT15M',
                },
            })
        }

        // Fetch data from Airtable
        const now = new Date()
        const startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 2) // 2 months back
        const endDate = new Date(now)
        endDate.setMonth(now.getMonth() + 4) // 4 months forward

        const [bookings, clients, procedures] = await Promise.all([
            getBookings(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
            getClients(),
            getAllProcedures(),
        ])

        // iCal formatting helpers
        const formatDateICS = (dateStr: string) => {
            return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        }

        const escapeICS = (str: string) => {
            return str.replace(/[,;\\]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')
        }

        const foldLine = (line: string) => {
            const parts = []
            while (line.length > 75) {
                parts.push(line.slice(0, 75))
                line = ' ' + line.slice(75)
            }
            parts.push(line)
            return parts.join('\r\n')
        }

        const host = request.headers.get('host') || 'nailmaster.vercel.app'

        let icsLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Nail Master//Booking Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Nail Master Bookings',
            'X-WR-CALDESC:Расписание записей мастера маникюра',
            'X-WR-TIMEZONE:Asia/Jerusalem',
            'X-PUBLISHED-TTL:PT15M',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
            'BEGIN:VTIMEZONE',
            'TZID:Asia/Jerusalem',
            'X-LIC-LOCATION:Asia/Jerusalem',
            'BEGIN:DAYLIGHT',
            'TZOFFSETFROM:+0200',
            'TZOFFSETTO:+0300',
            'TZNAME:IDT',
            'DTSTART:19700327T020000',
            'RRULE:FREQ=YEARLY;BYDAY=-1FR;BYMONTH=3',
            'END:DAYLIGHT',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:+0300',
            'TZOFFSETTO:+0200',
            'TZNAME:IST',
            'DTSTART:19701025T020000',
            'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
            'END:STANDARD',
            'END:VTIMEZONE',
        ]

        bookings.forEach((booking: Booking) => {
            const { fields, id, createdTime } = booking
            const isMeTime = fields.Is_Me_Time === true
            const date = fields.Date || ''
            const durationSeconds = fields.Total_Duration || 3600

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
                    .map(procId => procedures.find(p => p.id === procId)?.fields.Name)
                    .filter(Boolean)
                    .join(', ')

                summary = `💅 ${clientName}${bookingProcedures ? ` (${bookingProcedures})` : ''}`
                description = `Клиент: ${clientName}\\nТелефон: ${clientPhone}${bookingProcedures ? `\\nПроцедуры: ${bookingProcedures}` : ''}\\nЦена: ₪${fields.Total_Price || 0}`
            }

            icsLines.push('BEGIN:VEVENT')
            icsLines.push(`UID:booking-${id}@${host}`)
            icsLines.push(`DTSTAMP:${formatDateICS(createdTime || new Date().toISOString())}`)
            icsLines.push(`DTSTART;TZID=Asia/Jerusalem:${formatDateICS(startTime.toISOString()).replace('Z', '')}`)
            icsLines.push(`DTEND;TZID=Asia/Jerusalem:${formatDateICS(endTime.toISOString()).replace('Z', '')}`)
            icsLines.push(foldLine(`SUMMARY:${escapeICS(summary)}`))
            icsLines.push(foldLine(`DESCRIPTION:${escapeICS(description)}`))
            icsLines.push('TRANSP:OPAQUE')
            icsLines.push('STATUS:CONFIRMED')
            icsLines.push('END:VEVENT')
        })

        icsLines.push('END:VCALENDAR')

        return new Response(icsLines.join('\r\n'), {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="bookings.ics"',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        })
    } catch (error) {
        console.error('Error generating iCal feed:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
