import { connectDB } from '@/lib/db/mongodb';

/**
 * GET /api/db-test
 * Verifies MongoDB connection and returns status.
 */
export async function GET() {
  try {
    await connectDB();
    console.log('[API] MongoDB connection test: SUCCESS');
    return new Response(JSON.stringify({ success: true, message: 'MongoDB connected successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API] MongoDB connection test: ERROR', error);
    return new Response(JSON.stringify({ success: false, message: 'MongoDB connection failed.', error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 