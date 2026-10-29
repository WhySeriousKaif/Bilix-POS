import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser, clearError } from '@/store/slices/authSlice'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { shiftReportAPI } from '@/services/api'

const Login = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Only redirect if user just successfully logged in (not from localStorage)
    // Check if there's a valid token and user, but also verify it's a fresh login
    // We'll only redirect after successful login, not on initial load
    // This prevents redirecting users with expired/invalid tokens
    if (isAuthenticated && user && !loading) {
      // Verify token is valid by checking if we can access user profile
      // If token is invalid, ProtectedRoute will handle redirect to login
      const role = user.role || user.authorities?.[0]?.authority
      // Only redirect if we have a valid role
      if (role) {
        // ROLE_ADMIN is Super Admin (only kaiftruth101@gmail.com) → /super-admin
        if (role === 'ROLE_ADMIN') {
          navigate('/super-admin')
        } else if (role === 'ROLE_STORE_ADMIN') {
          // ROLE_STORE_ADMIN is Store Admin (can be many) → /store
          navigate('/store')
        } else if (role === 'ROLE_BRANCH_MANAGER' || role === 'ROLE_STORE_MANAGER') {
          navigate('/branch')
        } else if (role === 'ROLE_BRANCH_CASHIER' || role === 'ROLE_CASHIER') {
          navigate('/cashier')
        } else {
          navigate('/cashier')
        }
      }
    }
  }, [isAuthenticated, user, loading, navigate])

  useEffect(() => {
    // Clear error when component unmounts or form changes
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) {
      dispatch(clearError())
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      return
    }

    try {
      const result = await dispatch(loginUser(formData))
      if (loginUser.fulfilled.match(result)) {
        // Auto-start shift for cashiers
        const user = result.payload.user;
        const role = user.role;
        if (role === 'ROLE_BRANCH_CASHIER' || role === 'ROLE_CASHIER') {
          try {
            await shiftReportAPI.startShift(user.id, user.branchId);
          } catch (shiftError) {
            console.error("Failed to auto-start shift:", shiftError);
            // Continue login even if shift start fails (user might have active shift)
          }
        }
        // Navigation will happen in useEffect
      }
    } catch (err) {
      console.error('Login error:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 transition-colors">
      <div className="w-full max-w-md">
        <div
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-3 mb-8 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shadow-xl group-hover:scale-105 transition-all overflow-hidden border border-blue-900/40">
            <img src="/bilix_logo.png" alt="Bilix" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Bilix
          </span>
        </div>

      <div className="w-full rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="space-y-1 p-6 text-center">
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/auth/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Login
