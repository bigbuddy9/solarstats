'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import type { Settings, Profile } from '@/lib/supabase'

interface NavProps {
  settings: Settings | null
  profile: Profile | null
}

export default function Nav({ settings, profile }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const linkCls = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      pathname === path
        ? 'bg-white/10 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`

  const bizName = settings?.business_name ?? 'Team'

  return (
    <nav className="border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-brand mr-3" />
            <Link href="/log-call" className={linkCls('/log-call')}>Log Call</Link>
            <Link href="/dashboard" className={linkCls('/dashboard')}>
              {profile?.role === 'owner' ? `${bizName} Dashboard` : `${bizName} Stats`}
            </Link>
            {profile?.role === 'owner' && (
              <Link href="/team" className={linkCls('/team')}>Team</Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{profile?.name}</span>
            {profile?.role === 'owner' && (
              <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded font-medium">Owner</span>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-gray-400 hover:text-black transition-all px-3 py-1.5 rounded-lg border border-white/10 hover:bg-brand hover:border-brand"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
