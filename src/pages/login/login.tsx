import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function LoginScreen() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            email: '',
            password: '',
        },
        validationSchema: Yup.object({
            email: Yup.string()
                .email('Enter a valid email address')
                .required('Email is required'),
            password: Yup.string()
                .required('Password is required'),
        }),
        onSubmit: async (values) => {
            setLoginError(null);
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Log in attempt:', values);
            
            // Simulate random error or success
            // In a real app, if supabase.auth.signInWithPassword fails, we setLoginError
            // if (error) { setLoginError("Incorrect email or password"); return; }
            
            // Stage 10 logic: Check last_active_date and update streak here

            navigate('/home');
        },
    });

    const handleGoogleLogin = () => {
        console.log('Google login');
        // supabase.auth.signInWithOAuth({ provider: 'google' })
    };

    const handleForgotPassword = () => {
        console.log('Forgot password');
        // Navigate to forgot password flow or show toast
    };

    return (
        <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
            {/* Minimal Header */}
            <header className="p-6 flex items-center justify-between max-w-lg mx-auto w-full">
                <Link to="/" className="font-display font-semibold text-xl text-ink tracking-tight">
                    Curio
                </Link>
                <button
                    onClick={() => navigate('/')}
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
                        <h1 className="font-display text-3xl font-bold text-ink mb-2">Welcome back</h1>
                        <p className="text-faded-ink text-sm">Pick up where you left off.</p>
                    </div>

                    {/* Google Login */}
                    <Button variant="secondary" className="w-full mb-6" onClick={handleGoogleLogin}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </Button>

                    {/* Divider */}
                    <div className="relative flex items-center py-5 mb-2">
                        <div className="flex-grow border-t border-ink/10"></div>
                        <span className="flex-shrink-0 mx-4 text-faded-ink text-sm">or</span>
                        <div className="flex-grow border-t border-ink/10"></div>
                    </div>

                    {/* Banner Error */}
                    <AnimatePresence>
                        {loginError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2"
                            >
                                <AlertCircle size={18} />
                                {loginError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email/Password Form */}
                    <form onSubmit={formik.handleSubmit} className="flex flex-col gap-5">
                        {/* Email Field */}
                        <Input
                            label="Email"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.email}
                            error={formik.errors.email}
                            touched={formik.touched.email}
                        />

                        {/* Password Field */}
                        <div className="flex flex-col">
                            <Input
                                label="Password"
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.password}
                                error={formik.errors.password}
                                touched={formik.touched.password}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-1.5 text-faded-ink hover:text-ink transition-colors rounded-lg hover:bg-ink/5 focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-sm text-faded-ink hover:text-ember transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            isLoading={formik.isSubmitting}
                            className="mt-4 w-full"
                        >
                            Log in
                        </Button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-ink">
                            Don't have an account? <Link to="/signup" className="text-ember font-medium hover:underline">Sign up</Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
