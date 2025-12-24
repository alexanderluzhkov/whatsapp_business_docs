interface BookingCardProps {
  clientName: string
  procedures: string[]
  totalDuration: string
  isMeTime?: boolean
  meTimeTitle?: string
  onClick: () => void
}

export default function BookingCard({
  clientName,
  procedures,
  totalDuration,
  isMeTime,
  meTimeTitle,
  onClick,
}: BookingCardProps) {
  // Join procedures with comma, truncate if too long
  const proceduresText = isMeTime ? (meTimeTitle || 'Личное время') : procedures.join(', ')
  const truncatedProcedures =
    proceduresText.length > 30
      ? proceduresText.substring(0, 30) + '...'
      : proceduresText

  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[30px] rounded-md p-1.5 text-left cursor-pointer transition-colors shadow-sm flex flex-col justify-start overflow-hidden ${isMeTime
          ? 'bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white'
          : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
        }`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Client Name / Me Time Indicator */}
          <div className="font-bold text-[11px] leading-tight truncate">
            {isMeTime ? '🧘 Личное время' : clientName}
          </div>

          {/* Procedures / Me Time Title */}
          <div className="text-[10px] leading-tight opacity-90 line-clamp-1 mt-0.5" title={proceduresText}>
            {truncatedProcedures}
          </div>
        </div>

        {/* Duration */}
        <div className="text-[9px] leading-tight font-medium mt-auto pt-1 border-t border-white/20">
          {totalDuration} мин
        </div>
      </div>
    </button>
  )
}
