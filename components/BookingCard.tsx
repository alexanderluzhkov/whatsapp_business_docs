interface BookingCardProps {
  clientName: string
  procedures: string[]
  totalDuration: string
  slotSpan: number // Number of 30-minute slots this booking spans
  onClick: () => void
  slotHeight?: number // Height in pixels of each slot (default: 64 for desktop)
}

export default function BookingCard({
  clientName,
  procedures,
  totalDuration,
  slotSpan,
  onClick,
  slotHeight = 64,
}: BookingCardProps) {
  // Calculate height based on slot height, minus 1px for bottom border
  const cardHeight = slotSpan * slotHeight - 1

  // Join procedures with comma, truncate if too long
  const proceduresText = procedures.join(', ')

  // Adjust truncation length based on card height
  const maxLength = slotSpan > 2 ? 50 : 30
  const truncatedProcedures =
    proceduresText.length > maxLength
      ? proceduresText.substring(0, maxLength) + '...'
      : proceduresText

  return (
    <button
      onClick={onClick}
      style={{ height: `${cardHeight}px` }}
      className="absolute top-0 left-0 right-0 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-md p-2 text-left cursor-pointer transition-colors shadow-sm z-10"
    >
      <div className="space-y-0.5 h-full flex flex-col justify-start">
        {/* Client Name */}
        <div className="font-semibold text-xs leading-tight truncate">
          {clientName}
        </div>

        {/* Procedures */}
        <div
          className={`text-xs leading-tight opacity-90 ${slotSpan > 2 ? '' : 'line-clamp-2'}`}
          title={proceduresText}
        >
          {truncatedProcedures}
        </div>

        {/* Duration */}
        <div className="text-xs leading-tight font-medium opacity-95">
          {totalDuration}
        </div>
      </div>
    </button>
  )
}
