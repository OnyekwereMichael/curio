import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function SignupScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string()
        .email('Enter a valid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Sign up attempt:', values);
      // After success, we'd navigate to install nudge or dashboard
      // navigate('/install-nudge');
    },
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
      {/* Minimal Header */}
      <header className="p-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link to="/" className="font-display font-semibold text-xl text-ink tracking-tight">
          Curio
        </Link>
        <button 
          onClick={() => navigate(-1)}
          className="p-2 text-faded-ink hover:text-ink transition-colors rounded-full hover:bg-ink/5"
          aria-label="Go back"
        >
          <X size={24} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 pb-20">
        <div className="w-full max-w-md">
          {/* Headline Block */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-ink mb-2">Create your account</h1>
            <p className="text-faded-ink text-sm">Your first word is waiting.</p>
          </div>

          {/* Google Sign Up */}
          <button className="w-full flex items-center justify-center gap-3 bg-paper border border-ink/20 text-ink font-medium px-5 py-3 rounded-xl hover:bg-ink/5 transition-colors mb-6 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center py-5 mb-2">
            <div className="flex-grow border-t border-ink/10"></div>
            <span className="flex-shrink-0 mx-4 text-faded-ink text-sm">or</span>
            <div className="flex-grow border-t border-ink/10"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={formik.handleSubmit} className="flex flex-col gap-5">
            {/* Name and Email Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Name Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-ink">Name</label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jane Doe"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.name}
                    className={cn(
                      "w-full bg-paper border rounded-xl px-4 py-3 text-ink placeholder:text-faded-ink/60 focus:outline-none focus:ring-2 transition-all",
                      formik.touched.name && formik.errors.name
                        ? "border-red-500 focus:ring-red-500/20 pr-10"
                        : "border-ink/20 focus:border-ink/50 focus:ring-ink/10"
                    )}
                    aria-invalid={formik.touched.name && !!formik.errors.name}
                    aria-describedby="name-error"
                  />
                  {formik.touched.name && formik.errors.name && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500">
                      <AlertCircle size={18} />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {formik.touched.name && formik.errors.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-sm mt-1"
                      id="name-error"
                    >
                      {formik.errors.name}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.email}
                    className={cn(
                      "w-full bg-paper border rounded-xl px-4 py-3 text-ink placeholder:text-faded-ink/60 focus:outline-none focus:ring-2 transition-all",
                      formik.touched.email && formik.errors.email
                        ? "border-red-500 focus:ring-red-500/20 pr-10"
                        : "border-ink/20 focus:border-ink/50 focus:ring-ink/10"
                    )}
                    aria-invalid={formik.touched.email && !!formik.errors.email}
                    aria-describedby="email-error"
                  />
                  {formik.touched.email && formik.errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500">
                      <AlertCircle size={18} />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {formik.touched.email && formik.errors.email && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-sm mt-1"
                      id="email-error"
                    >
                      {formik.errors.email}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  className={cn(
                    "w-full bg-paper border rounded-xl pl-4 pr-12 py-3 text-ink placeholder:text-faded-ink/60 focus:outline-none focus:ring-2 transition-all",
                    formik.touched.password && formik.errors.password
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-ink/20 focus:border-ink/50 focus:ring-ink/10"
                  )}
                  aria-invalid={formik.touched.password && !!formik.errors.password}
                  aria-describedby="password-error"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  {formik.touched.password && formik.errors.password && (
                    <span className="text-red-500 pointer-events-none">
                      <AlertCircle size={18} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-faded-ink hover:text-ink transition-colors rounded-lg hover:bg-ink/5 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {formik.touched.password && formik.errors.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm mt-1"
                    id="password-error"
                  >
                    {formik.errors.password}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="mt-2 w-full bg-ember text-paper font-semibold text-base px-5 py-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-ember/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {formik.isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <p className="text-sm text-ink mb-6">
              Already have an account? <Link to="/login" className="text-ember font-medium hover:underline">Log in</Link>
            </p>
            <p className="text-xs text-faded-ink leading-relaxed">
              By creating an account, you agree to our <Link to="/terms" className="underline hover:text-ink transition-colors">Terms</Link> and <Link to="/privacy" className="underline hover:text-ink transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
