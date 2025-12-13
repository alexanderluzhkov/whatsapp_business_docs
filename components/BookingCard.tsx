interface BookingCardProps {
  clientName: string
  procedures: string[]
  totalDuration: string
  onClick: () => void
}

export default function BookingCard({
  clientName,
  procedures,
  totalDuration,
  onClick,
}: BookingCardProps) {
  // Join procedures with comma, truncate if too long
  const proceduresText = procedures.join(', ')
  const truncatedProcedures =
    proceduresText.length > 30
      ? proceduresText.substring(0, 30) + '...'
      : proceduresText

  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[44px] bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-md p-2 text-left cursor-pointer transition-colors shadow-sm flex flex-col justify-start"
    >
      <div className="space-y-1">
        {/* Client Name */}
        <div className="font-semibold text-sm leading-tight truncate">
          {clientName}
        </div>

        {/* Procedures */}
        <div className="text-xs leading-tight opacity-90 line-clamp-2" title={proceduresText}>
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
