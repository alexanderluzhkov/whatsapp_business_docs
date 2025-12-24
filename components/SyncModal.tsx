'use client'

import { useState } from 'react'

interface SyncModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SyncModal({ isOpen, onClose }: SyncModalProps) {
    const [copied, setCopied] = useState(false)

    if (!isOpen) return null

    const syncUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/feed?token=nail-master-personal-sync`

    const handleCopy = () => {
        navigator.clipboard.writeText(syncUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span>📅</span> Синхронизация с iPhone
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-gray-600 mb-3">
                                Скопируйте эту ссылку и добавьте её в настройки iPhone, чтобы видеть записи на экране блокировки:
                            </p>
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    readOnly
                                    value={syncUrl}
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 font-mono"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'
                                        }`}
                                >
                                    {copied ? '✅' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-blue-900 mb-2">Как настроить на iPhone:</h3>
                            <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
                                <li>Откройте настройки iPhone</li>
                                <li>Перейдите в <span className="font-bold">Календарь</span></li>
                                <li>Нажмите <span className="font-bold">Учетные записи</span></li>
                                <li>Выберите <span className="font-bold">Новая учетная запись</span></li>
                                <li>Нажмите <span className="font-bold">Другое</span> → <span className="font-bold">Подписной календарь</span></li>
                                <li>Вставьте скопированную ссылку</li>
                            </ol>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl transition-colors"
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
