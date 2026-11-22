import { ArrowRight, ChevronDown, CloudUpload, FileText, Home, Languages, LogOut, Menu, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { displayNameOf, initialsOf } from '../../lib/format'
import { Alert } from '../common/Alert'
import { Logo } from '../common/Logo'
import { ThemeToggle } from '../common/ThemeToggle'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Custom active test, for sections whose pages are not all under `to`. */
  match?: (pathname: string) => boolean
}

function useNavItems(): NavItem[] {
  const { role } = useAuth()
  const items: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <Home size={20} aria-hidden /> },
    {
      to: '/documents',
      label: 'My Documents',
      icon: <FileText size={20} aria-hidden />,
      match: (p) => p.startsWith('/documents') && p !== '/documents/upload',
    },
    { to: '/documents/upload', label: 'Upload Document', icon: <CloudUpload size={20} aria-hidden /> },
  ]
  // Shown only for the translator role. The backend still enforces access to the data itself.
  if (role === 'translator') {
    items.push({ to: '/translator', label: 'Translator', icon: <Languages size={20} aria-hidden /> })
  }
  return items
}

function SidebarContent({ onSignOut, signingOut }: { onSignOut: () => void; signingOut: boolean }) {
  const items = useNavItems()
  const { pathname } = useLocation()
  const itemCls = (active: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? 'bg-brand-soft-2 font-medium text-brand-ink' : 'text-ink hover:bg-hover'
    }`
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-6">
      <Link to="/dashboard" className="px-2 text-ink" aria-label="Transly dashboard">
        <Logo size={34} />
      </Link>

      <nav aria-label="Main" className="space-y-1.5">
        {items.map((it) => {
          const active = it.match ? it.match(pathname) : pathname === it.to || pathname.startsWith(`${it.to}/`)
          return (
            <NavLink key={it.to} to={it.to} className={itemCls(active)} aria-current={active ? 'page' : undefined}>
              {it.icon}
              {it.label}
            </NavLink>
          )
        })}
        <button type="button" onClick={onSignOut} disabled={signingOut} className={itemCls(false)}>
          <LogOut size={20} aria-hidden />
          {signingOut ? 'Logging out…' : 'Logout'}
        </button>
      </nav>

      <div className="mt-auto space-y-5">
        <div className="rounded-2xl border border-brand-soft-2 bg-brand-soft p-4 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-soft-2 text-brand-ink">
            <ShieldCheck size={22} aria-hidden />
          </span>
          <p className="mt-2 font-semibold text-ink">Need Help?</p>
          <p className="mt-1 text-xs text-ink-2">Read the frequently asked questions.</p>
          <Link
            to="/#faq"
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-soft-2 px-4 text-xs font-medium text-brand-ink transition duration-150 hover:brightness-95"
          >
            Visit FAQ <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <p className="px-2 text-[11px] leading-4 text-muted">
          © {new Date().getFullYear()} Transly. An independent project, not a government service.
        </p>
      </div>
    </div>
  )
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { user, role } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition duration-150 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
          {initialsOf(user.email)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium text-ink sm:block">{displayNameOf(user.email)}</span>
        <ChevronDown size={16} className="text-ink-2" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-elevated p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.email}</p>
            <p className="text-xs text-ink-2">{role === 'translator' ? 'Translator account' : 'Document user'}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-ink transition duration-150 hover:bg-hover"
          >
            <LogOut size={16} aria-hidden /> Logout
          </button>
        </div>
      )}
    </div>
  )
}

/** Searches the user's own documents: submits to /documents?q=… */
function DocumentSearch() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const urlQ = pathname === '/documents' ? (params.get('q') ?? '') : ''
  const [q, setQ] = useState(urlQ)
  useEffect(() => setQ(urlQ), [urlQ])

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = q.trim()
    nav(v ? `/documents?q=${encodeURIComponent(v)}` : '/documents')
  }

  return (
    <form role="search" onSubmit={submit} className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your documents…"
        aria-label="Search your documents"
        className="block min-h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-muted transition duration-150 focus:border-focus focus:outline-none focus:ring-2 focus:ring-ring/60"
      />
    </form>
  )
}

/** Authenticated shell: sidebar (drawer on phones), top bar, page content. */
export function AppLayout() {
  const { signOut } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  // Close the drawer whenever the page changes.
  useEffect(() => setDrawer(false), [pathname])
  useEffect(() => {
    document.body.classList.toggle('max-lg:overflow-hidden', drawer)
    return () => document.body.classList.remove('max-lg:overflow-hidden')
  }, [drawer])

  async function onSignOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      nav('/login', { replace: true })
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : String(e))
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="app-backdrop flex min-h-dvh flex-col">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-surface/80 backdrop-blur lg:block">
          <SidebarContent onSignOut={() => void onSignOut()} signingOut={signingOut} />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="relative h-full w-72 max-w-[85vw] border-r border-line bg-surface shadow-2xl">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-5 flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-hover"
              >
                <X size={20} aria-hidden />
              </button>
              <SidebarContent onSignOut={() => void onSignOut()} signingOut={signingOut} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-6 lg:border-0 lg:bg-transparent lg:px-8 lg:py-5 lg:backdrop-blur-none">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink lg:hidden"
            >
              <Menu size={20} aria-hidden />
            </button>
            <DocumentSearch />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <UserMenu onSignOut={() => void onSignOut()} />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-0">
            {signOutError && (
              <div className="mb-4">
                <Alert tone="error" title="Could not log out">
                  {signOutError}
                </Alert>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
