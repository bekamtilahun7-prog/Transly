import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hasCompletedPlanChoice } from '../../lib/subscription'
import { Alert } from '../common/Alert'
import { buttonClass } from '../common/Button'
import { LoadingState } from '../common/LoadingState'

/** Sends signed-out visitors to /login and remembers where they were going. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <LoadingState label="Checking your session…" className="min-h-dvh" />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <Outlet />
}

/**
 * Hides translator screens from other roles. This is a convenience only:
 * the backend decides what a user may actually read or issue.
 */
export function RequireTranslator() {
  const { role, loading, profileError } = useAuth()
  if (loading) return <LoadingState />
  if (role !== 'translator') {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <Alert
          tone="warn"
          title="Translator access only"
          action={
            <Link to="/dashboard" className={buttonClass('secondary', 'sm')}>
              Back to dashboard
            </Link>
          }
        >
          Your account does not have the translator role.
          {profileError ? ` Your profile could not be checked: ${profileError}` : ''}
        </Alert>
      </div>
    )
  }
  return <Outlet />
}

/** Signed-in users skip the login/register screens. */
export function RedirectIfAuthed() {
  const { user, role, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <LoadingState label="Checking your session…" className="min-h-dvh" />
  if (user) {
    const from = (loc.state as { from?: string } | null)?.from
    if (from) return <Navigate to={from} replace />
    if (role === 'translator') return <Navigate to="/dashboard" replace />
    return <Navigate to={hasCompletedPlanChoice() ? '/dashboard' : '/onboarding'} replace />
  }
  return <Outlet />
}

/** Customers pick a plan once after login. Translators skip this. */
export function RequirePlanChoice() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingState />
  if (role === 'translator' || hasCompletedPlanChoice()) return <Outlet />
  return <Navigate to="/onboarding" replace />
}
