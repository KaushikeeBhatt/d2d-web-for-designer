"use client";

import React from "react";

/**
 * Global error boundary for the App Router.
 * This component is required by Next.js for error handling.
 */
export default function Error({ error, reset }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <pre style={{ color: 'red', margin: '16px 0' }}>{error?.message || 'Unknown error'}</pre>
      <button onClick={() => reset?.()} style={{ padding: '8px 16px', fontSize: 16 }}>
        Try again
      </button>
    </div>
  );
}
