'use client';

import { useState, useCallback, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

/**
 * LoginForm Component
 * Handles user authentication with Google OAuth and email/password
 * Integrates with Auth.js v5 for authentication
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Get redirect URL from query params or default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const errorParam = searchParams.get('error');

  /**
   * Handle Auth.js error parameters
   */
  useEffect(() => {
    if (errorParam) {
      console.error('[LoginForm] Auth error detected:', errorParam);
      
      // Map Auth.js errors to user-friendly messages
      const errorMessages = {
        'OAuthSignin': 'Error connecting to provider. Please try again.',
        'OAuthCallback': 'Error during authentication. Please try again.',
        'OAuthCreateAccount': 'Could not create account. Please try again.',
        'EmailCreateAccount': 'Could not create account. Please try again.',
        'Callback': 'Error during authentication. Please try again.',
        'OAuthAccountNotLinked': 'Account already exists with different provider.',
        'EmailSignin': 'Error sending verification email.',
        'CredentialsSignin': 'Invalid email or password.',
        'SessionRequired': 'Please sign in to continue.',
        'Default': 'An error occurred. Please try again.'
      };

      setError(errorMessages[errorParam] || errorMessages['Default']);
    }
  }, [errorParam]);

  /**
   * Handle form input changes
   */
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handle Google OAuth sign in
   */
  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[LoginForm] Initiating Google sign in');
      
      const result = await signIn('google', {
        callbackUrl,
        redirect: false
      });

      if (result?.error) {
        console.error('[LoginForm] Google sign in error:', result.error);
        setError('Failed to sign in with Google. Please try again.');
      } else if (result?.url) {
        console.log('[LoginForm] Google sign in successful, redirecting');
        router.push(result.url);
      }
    } catch (err) {
      console.error('[LoginForm] Unexpected error during Google sign in:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [callbackUrl, router]);

  /**
   * Handle email/password sign in (if implemented)
   */
  const handleEmailSignIn = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[LoginForm] Attempting email sign in for:', formData.email);
      
      // Note: Email/password sign in would need to be configured in auth.js
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl,
        redirect: false
      });

      if (result?.error) {
        console.error('[LoginForm] Email sign in error:', result.error);
        setError('Invalid email or password');
      } else if (result?.ok) {
        console.log('[LoginForm] Email sign in successful, redirecting');
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error('[LoginForm] Unexpected error during email sign in:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, callbackUrl, router]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600">
            Sign in to discover amazing design hackathons
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Email/Password Form (Optional - hidden by default) */}
        {false && (
          <form onSubmit={handleEmailSignIn} className="mb-6">
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        {false && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
        )}

        {/* Social Login Buttons */}
        <div className="space-y-3">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Sign in with Google"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Image
                src="https://www.google.com/favicon.ico"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
              />
            )}
            <span className="font-medium text-gray-700">
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <p className="mt-8 text-center text-xs text-gray-500">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-gray-700">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-gray-700">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}