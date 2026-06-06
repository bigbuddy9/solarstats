'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import type { Settings } from '@/lib/supabase'

interface NavProps {
  settings: Settings | null
}

export default function Nav({ settings }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + business name */}
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <Image
                src={settings.logo_url}
                alt={settings.business_name ?? 'Logo'}
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
            )}
            <span className="font-bold text-white text-lg">
              {settings?.business_name ?? 'Scale Solar'}
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/log-call"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/log-call'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Log Call
            </Link>
            <button
              onClick={handleSignOut}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
