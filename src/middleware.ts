import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: object }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Rotas públicas — não precisam de login
  const publicRoutes = ['/login', '/profiles']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  // Redireciona / para /profiles
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/profiles'
    return NextResponse.redirect(url)
  }

  // Sem login → vai para /profiles
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/profiles'
    return NextResponse.redirect(url)
  }

  // Com login → sai do login/profiles e vai pro dashboard
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}