'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateLong } from '@/lib/calendar-utils'
import type { Client, Procedure, BookingDisplay } from '@/types/airtable'

interface BookingFormProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedTime: string // "9:00", "14:30", etc.
  onBookingCreated: () => void
  existingBookings?: BookingDisplay[] // For conflict detection
  // Edit mode props
  editMode?: boolean
  bookingId?: string
  initialClientId?: string
  initialProcedureIds?: string[]
  initialCustomDuration?: number // in minutes
  initialIsMeTime?: boolean
  initialMeTimeTitle?: string
}

export default function BookingForm({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onBookingCreated,
  existingBookings = [],
  editMode = false,
  bookingId,
  initialClientId,
  initialProcedureIds,
  initialCustomDuration,
  initialIsMeTime,
  initialMeTimeTitle,
}: BookingFormProps) {
  // Form state
  const [clients, setClients] = useState<Client[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [editableDate, setEditableDate] = useState('')
  const [editableTime, setEditableTime] = useState('')
  const [customDuration, setCustomDuration] = useState<number>(0) // in minutes
  const [isDurationManuallyEdited, setIsDurationManuallyEdited] = useState(false) // Track manual edits
  const [isMeTime, setIsMeTime] = useState(false)
  const [meTimeTitle, setMeTimeTitle] = useState('')

  // New Client state
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false)
  const [newClientFirstName, setNewClientFirstName] = useState('')
  const [newClientLastName, setNewClientLastName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')

  // UI state
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Track previous isOpen state to detect when modal opens
  const prevIsOpenRef = useRef(false) // Initialize as false, not with current isOpen value

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Load clients and procedures on mount
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoadingData(true)
      setError(null)

      try {
        // Fetch clients and procedures in parallel
        const [clientsRes, proceduresRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/procedures'),
        ])

        const clientsData = await clientsRes.json()
        const proceduresData = await proceduresRes.json()

        if (!clientsData.success) {
          throw new Error(clientsData.error || 'Не удалось загрузить клиентов')
        }

        if (!proceduresData.success) {
          throw new Error(proceduresData.error || 'Не удалось загрузить процедуры')
        }

        setClients(clientsData.clients)
        setProcedures(proceduresData.procedures)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [isOpen])

  // Update editable date/time when props change (without resetting form)
  useEffect(() => {
    if (isOpen) {
      // Use local date components to avoid UTC shift issues
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      setEditableDate(dateStr)
      setEditableTime(selectedTime)
    }
  }, [isOpen, selectedDate, selectedTime])

  // Reset form only when modal transitions from closed to open
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current
    const isNowOpen = isOpen

    // Update ref for next render
    prevIsOpenRef.current = isOpen

    // Only reset when modal opens (transitions from false to true)
    if (!wasOpen && isNowOpen) {
      if (editMode && initialClientId) {
        // Edit mode: pre-fill with existing data
        setSelectedClientId(initialClientId)
        setSelectedProcedureIds(initialProcedureIds || [])
        setClientSearch('')

        // Pre-fill custom duration if it exists
        if (initialCustomDuration && initialCustomDuration > 0) {
          setCustomDuration(initialCustomDuration)
          setIsDurationManuallyEdited(true) // Mark as manually edited since it has custom duration
        } else {
          setCustomDuration(0)
          setIsDurationManuallyEdited(false)
        }
        setIsMeTime(initialIsMeTime || false)
        setMeTimeTitle(initialMeTimeTitle || '')
      } else {
        // Create mode: reset form
        setSelectedClientId('')
        setSelectedProcedureIds([])
        setClientSearch('')
        setCustomDuration(0)
        setIsDurationManuallyEdited(false)
        setIsMeTime(false)
        setMeTimeTitle('')
      }
      setIsCreatingNewClient(false)
      setNewClientFirstName('')
      setNewClientLastName('')
      setNewClientPhone('')
      setError(null)
      setConflictWarning(null)
    }
  }, [isOpen, editMode, initialClientId, initialProcedureIds, initialCustomDuration])

  useEffect(() => {
    if (selectedProcedureIds.length > 0 && procedures.length > 0 && !isMeTime) {
      const calculatedMinutes = calculateTotalMinutes()
      // Only auto-update if duration hasn't been manually edited
      if (!isDurationManuallyEdited) {
        setCustomDuration(calculatedMinutes)
      }
    }
  }, [selectedProcedureIds, procedures, isDurationManuallyEdited, isMeTime])

  // Set default 60 min for Me Time when switched on
  useEffect(() => {
    if (isMeTime && !editMode && !isDurationManuallyEdited) {
      setCustomDuration(60)
    }
  }, [isMeTime, editMode, isDurationManuallyEdited])

  // Check for conflicts when procedures or custom duration change
  useEffect(() => {
    if (selectedProcedureIds.length === 0 || !editableDate || !editableTime || customDuration === 0) {
      setConflictWarning(null)
      return
    }

    const [hours, minutes] = editableTime.split(':').map(Number)
    const bookingStart = new Date(editableDate)
    bookingStart.setHours(hours, minutes, 0, 0)

    const bookingEnd = new Date(bookingStart)
    bookingEnd.setMinutes(bookingEnd.getMinutes() + customDuration)

    // Check for conflicts (exclude current booking in edit mode)
    const conflict = existingBookings.find((booking) => {
      // Skip the current booking being edited
      if (editMode && bookingId && booking.id === bookingId) {
        return false
      }

      const existingStart = new Date(booking.date)
      const existingDurationMinutes = parseDuration(booking.totalDuration)
      const existingEnd = new Date(existingStart)
      existingEnd.setMinutes(existingEnd.getMinutes() + existingDurationMinutes)

      // Check if bookings overlap
      return (
        (bookingStart >= existingStart && bookingStart < existingEnd) ||
        (bookingEnd > existingStart && bookingEnd <= existingEnd) ||
        (bookingStart <= existingStart && bookingEnd >= existingEnd)
      )
    })

    if (conflict) {
      setConflictWarning(`⚠️ Внимание: время пересекается с записью ${conflict.clientName}`)
    } else {
      setConflictWarning(null)
    }
  }, [selectedProcedureIds, customDuration, editableDate, editableTime, existingBookings, editMode, bookingId])

  // Parse duration string (e.g., "1:30" -> 90 minutes)
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':')
    const hours = parseInt(parts[0] || '0', 10)
    const minutes = parseInt(parts[1] || '0', 10)
    return hours * 60 + minutes
  }

  // Convert seconds to HH:MM format
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // Convert minutes to H:MM format for display
  const formatMinutesToHHMM = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // Parse H:MM format to minutes
  const parseHHMMToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0] || '0', 10)
    const minutes = parseInt(parts[1] || '0', 10)
    return hours * 60 + minutes
  }

  // Calculate total duration in minutes
  const calculateTotalMinutes = (): number => {
    return selectedProcedureIds.reduce((total, procId) => {
      const procedure = procedures.find((p) => p.id === procId)
      if (procedure?.fields.Duration) {
        return total + Math.floor(procedure.fields.Duration / 60)
      }
      return total
    }, 0)
  }

  // Calculate total price
  const calculateTotalPrice = (): number => {
    return selectedProcedureIds.reduce((total, procId) => {
      const procedure = procedures.find((p) => p.id === procId)
      if (procedure?.fields.Price) {
        return total + procedure.fields.Price
      }
      return total
    }, 0)
  }

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    const searchLower = clientSearch.toLowerCase()
    const firstName = client.fields['First Name']?.toLowerCase() || ''
    const lastName = client.fields['Last Name']?.toLowerCase() || ''
    const phone = client.fields.Phone_Number?.toLowerCase() || ''

    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      phone.includes(searchLower)
    )
  })

  // Toggle procedure selection
  const toggleProcedure = (procedureId: string) => {
    setSelectedProcedureIds((prev) =>
      prev.includes(procedureId)
        ? prev.filter((id) => id !== procedureId)
        : [...prev, procedureId]
    )
  }

  // Format client display
  const formatClientDisplay = (client: Client): string => {
    const firstName = client.fields['First Name'] || ''
    const lastName = client.fields['Last Name'] || ''
    const phone = client.fields.Phone_Number || ''
    const name = `${firstName} ${lastName}`.trim() || 'Без имени'
    return `${name} (${phone})`
  }

  // Get selected client
  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Format date and time for display
  const formatDateTime = (): string => {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ]
    const day = selectedDate.getDate()
    const month = months[selectedDate.getMonth()]
    const year = selectedDate.getFullYear()
    return `${day} ${month} ${year}, ${selectedTime}`
  }

  // Handle delete booking
  const handleDelete = async () => {
    if (!editMode || !bookingId) return

    const confirmed = window.confirm('Вы уверены, что хотите удалить эту запись?')
    if (!confirmed) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Не удалось удалить запись')
      }

      // Success! Close modal and refresh
      onBookingCreated() // This also refreshes the calendar
      onClose()
    } catch (err) {
      console.error('Error deleting booking:', err)
      setError(err instanceof Error ? err.message : 'Ошибка удаления записи')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle creating a new client
  const handleCreateClient = async () => {
    if (!newClientFirstName || !newClientPhone) {
      setError('Имя и телефон обязательны для нового клиента')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newClientFirstName,
          lastName: newClientLastName,
          phoneNumber: newClientPhone,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Не удалось создать клиента')
      }

      // Add to local list and select
      const newClient = data.client
      setClients(prev => [...prev, newClient])
      setSelectedClientId(newClient.id)
      setIsCreatingNewClient(false)

      // Clear fields
      setNewClientFirstName('')
      setNewClientLastName('')
      setNewClientPhone('')
    } catch (err) {
      console.error('Error creating client:', err)
      setError(err instanceof Error ? err.message : 'Ошибка создания клиента')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!isMeTime && !selectedClientId) {
      setError('Пожалуйста, выберите клиента')
      return
    }

    if (!isMeTime && selectedProcedureIds.length === 0) {
      setError('Пожалуйста, выберите хотя бы одну процедуру')
      return
    }

    if (isMeTime && !meTimeTitle.trim()) {
      setError('Пожалуйста, укажите название активности')
      return
    }

    setIsSaving(true)

    try {
      // Combine date and time into ISO string
      const [hours, minutes] = editableTime.split(':').map(Number)
      const bookingDate = new Date(editableDate)
      bookingDate.setHours(hours, minutes, 0, 0)

      const payload = {
        clientId: isMeTime ? null : selectedClientId,
        procedureIds: isMeTime ? [] : selectedProcedureIds,
        date: bookingDate.toISOString(),
        customDuration: customDuration * 60, // Convert minutes to seconds for Airtable
        isMeTime,
        meTimeTitle: isMeTime ? meTimeTitle : undefined,
      }

      if (editMode && bookingId) {
        // Update existing booking
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Не удалось обновить запись')
        }
      } else {
        // Create new booking
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Не удалось создать запись')
        }
      }

      // Success! Close modal and refresh
      onBookingCreated()
      onClose()
    } catch (err) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} booking:`, err)
      setError(err instanceof Error ? err.message : `Ошибка ${editMode ? 'обновления' : 'создания'} записи`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const totalMinutes = calculateTotalMinutes()
  const totalPrice = calculateTotalPrice()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {editMode ? 'Редактировать запись' : 'Новая запись'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Loading State */}
          {isLoadingData && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Загрузка данных...</p>
            </div>
          )}

          {/* Form Fields */}
          {!isLoadingData && (
            <>
              {/* Date & Time (Editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата и время
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={editableDate}
                      onChange={(e) => setEditableDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="time"
                      value={editableTime}
                      onChange={(e) => setEditableTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Type Toggle */}
              <div className="flex p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsMeTime(false)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isMeTime ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Клиент
                </button>
                <button
                  type="button"
                  onClick={() => setIsMeTime(true)}
                  className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${isMeTime ? 'bg-white shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Личное время
                </button>
              </div>

              {isMeTime ? (
                /* Me Time Title */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Что планируете? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Обед, Обучение..."
                    value={meTimeTitle}
                    onChange={(e) => setMeTimeTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  />
                </div>
              ) : (
                <>
                  {/* Client Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Клиент <span className="text-red-500">*</span>
                      </label>
                      {!selectedClientId && !isCreatingNewClient && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewClient(true)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          + Новый клиент
                        </button>
                      )}
                      {isCreatingNewClient && !selectedClientId && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewClient(false)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-600"
                        >
                          Отмена
                        </button>
                      )}
                    </div>

                    {/* New Client Form */}
                    {isCreatingNewClient && !selectedClientId && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Имя *"
                            value={newClientFirstName}
                            onChange={(e) => setNewClientFirstName(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Фамилия"
                            value={newClientLastName}
                            onChange={(e) => setNewClientLastName(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="Телефон *"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCreateClient}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Existing Client Search */}
                    {!selectedClientId && !isCreatingNewClient && (
                      <>
                        <input
                          type="text"
                          placeholder="Поиск клиента..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        {clientSearch && (
                          <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-200 shadow-md">
                            {filteredClients.length === 0 ? (
                              <div className="px-4 py-3 text-gray-500 text-sm bg-white">
                                Клиенты не найдены
                              </div>
                            ) : (
                              filteredClients.map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClientId(client.id)
                                    setClientSearch('')
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors bg-white font-medium text-sm text-gray-900"
                                >
                                  {formatClientDisplay(client)}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Show selected client */}
                    {selectedClientId && selectedClient && (
                      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-900">
                          {formatClientDisplay(selectedClient)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId('')
                            setClientSearch('')
                            setIsCreatingNewClient(false)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-bold"
                        >
                          Изменить
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Procedures */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Процедуры <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {procedures.map((procedure) => {
                        const duration = procedure.fields.Duration
                          ? formatDuration(procedure.fields.Duration)
                          : '0:00'
                        const price = Math.round(procedure.fields.Price || 0)
                        const isSelected = selectedProcedureIds.includes(procedure.id)

                        return (
                          <label
                            key={procedure.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-purple-50 border border-purple-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProcedure(procedure.id)}
                              className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {procedure.fields.Name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {duration} • ₪{price}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Duration and Price (Price only for clients) */}
              {(isMeTime || selectedProcedureIds.length > 0) && (
                <div className={`${isMeTime ? 'bg-sky-50 border-sky-200' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4`}>
                  <div className={`grid ${isMeTime ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    {/* Editable Duration */}
                    <div>
                      <label className={`block text-sm ${isMeTime ? 'text-sky-700' : 'text-purple-700'} font-medium mb-2`}>
                        Длительность
                      </label>
                      <input
                        type="text"
                        value={formatMinutesToHHMM(customDuration)}
                        onChange={(e) => {
                          const minutes = parseHHMMToMinutes(e.target.value)
                          if (!isNaN(minutes)) {
                            setCustomDuration(minutes)
                            setIsDurationManuallyEdited(true)
                          }
                        }}
                        placeholder="0:00"
                        className={`w-full px-3 py-2 border ${isMeTime ? 'border-sky-300 focus:ring-sky-500 focus:border-sky-500 text-sky-900' : 'border-purple-300 focus:ring-purple-500 focus:border-purple-500 text-purple-900'} rounded-lg focus:ring-2 outline-none text-lg font-bold`}
                      />
                      {isDurationManuallyEdited && !isMeTime && customDuration !== totalMinutes && totalMinutes > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          Рассчитано из процедур: {formatMinutesToHHMM(totalMinutes)}
                        </div>
                      )}
                    </div>
                    {/* Total Price (Only Client) */}
                    {!isMeTime && (
                      <div>
                        <div className="text-sm text-purple-700 font-medium mb-2">
                          Общая стоимость
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          ₪{totalPrice}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conflict Warning */}
              {conflictWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-yellow-800">{conflictWarning}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {editMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingData}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
