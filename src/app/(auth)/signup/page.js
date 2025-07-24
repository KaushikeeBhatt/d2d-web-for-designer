'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { SignupForm } from '@/components/auth/SignupForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('SignupPage');

/**
 * Signup page component
 * Handles new user registration with Google OAuth
 * @returns {JSX.Element} Signup page
 */
export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Get callback URL from search params or default to dashboard
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  /**
   * Check if user is already authenticated
   */
  useEffect(() => {
    // Log page visit
    logger.info('Signup page accessed', { 
      callbackUrl, 
      hasSession: !!session,
      status 
    });

    // Redirect if already authenticated
    if (status === 'authenticated' && session?.user) {
      logger.info('User already authenticated, redirecting', { 
        userId: session.user.id,
        redirectTo: callbackUrl 
      });
      router.push(callbackUrl);
    }
  }, [session, status, callbackUrl, router]);

  /**
   * Handle Google OAuth sign up
   */
  const handleGoogleSignUp = async () => {
    try {
      // Validate terms agreement
      if (!agreedToTerms) {
        setError('Please agree to the Terms of Service and Privacy Policy');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      logger.info('Initiating Google sign up', { callbackUrl });

      // Call NextAuth signIn with Google provider
      const result = await signIn('google', {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        logger.error('Google sign up failed', { error: result.error });
        setError('Failed to sign up with Google. Please try again.');
      } else if (result?.url) {
        logger.info('Google sign up successful, redirecting', { url: result.url });
        router.push(result.url);
      }
    } catch (err) {
      logger.error('Unexpected error during sign up', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle authentication errors from URL params
   */
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      logger.warn('Authentication error detected', { error });
      
      // Map NextAuth error codes to user-friendly messages
      const errorMessages = {
        'OAuthSignin': 'Error occurred during sign up. Please try again.',
        'OAuthCallback': 'Error occurred during authentication. Please try again.',
        'OAuthCreateAccount': 'Could not create account. Please try again.',
        'EmailCreateAccount': 'Could not create account. Please try again.',
        'Callback': 'Error occurred during authentication callback.',
        'Default': 'An error occurred during sign up. Please try again.'
      };
      
      setError(errorMessages[error] || errorMessages.Default);
    }
  }, [searchParams]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Title */}
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="D2D Designer"
            width={48}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join the community of design hackathon enthusiasts
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Benefits list */}
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-900">Why join D2D Designer?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Discover design hackathons from multiple platforms
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Bookmark and track your favorite events
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Get curated design inspiration from EyeCandy
              </li>
            </ul>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignUp}
              disabled={isLoading || status === 'loading' || !agreedToTerms}
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </Button>
          </div>

          {/* Terms and Privacy */}
          <div className="mt-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
          </div>

          {/* Alternative signup form (for future implementation) */}
          <div className="mt-6">
            <SignupForm 
              onSuccess={(data) => {
                logger.info('Signup form success', { email: data.email });
                router.push(callbackUrl);
              }}
              onError={(error) => {
                logger.error('Signup form error', error);
                setError(error.message);
              }}
              agreedToTerms={agreedToTerms}
            />
          </div>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign in
              </Link>
            </span>
          </div>
        </Card>

        {/* Footer links */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}