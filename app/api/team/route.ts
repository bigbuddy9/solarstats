import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is owner
  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', session.user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()

  // Create auth user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: role ?? 'rep' },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Explicitly upsert profile in case the trigger doesn't fire
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: newUser.user.id, name, role: role ?? 'rep', tenant_id: profile.tenant_id }, { onConflict: 'id' })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ id: newUser.user.id })
}

export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
