import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            📅 Календарь записей
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Управление записями клиентов для мастера маникюра
          </p>

          {/* Main CTA Button */}
          <Link
            href="/calendar"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Открыть календарь
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📆</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Недельный календарь
            </h3>
            <p className="text-sm text-gray-600">
              Удобный недельный вид с временными слотами с 9:00 до 20:00
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Быстрое создание записи
            </h3>
            <p className="text-sm text-gray-600">
              Создавайте записи одним нажатием на свободный временной слот
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Мобильная версия
            </h3>
            <p className="text-sm text-gray-600">
              Оптимизировано для использования на iPhone во время разговора с клиентом
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Phase 1 - MVP
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Недельный календарь с временными слотами</li>
                <li>✅ Навигация по неделям</li>
                <li>⏳ Создание и редактирование записей (в разработке)</li>
                <li>⏳ Интеграция с Airtable (в разработке)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/api/test"
            target="_blank"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            🔌 Тест API
          </Link>
        </div>
      </div>
    </main>
  )
}
