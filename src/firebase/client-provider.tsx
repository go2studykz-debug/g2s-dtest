'use client';

import React, { useMemo, ReactNode } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseValues = useMemo(() => {
    try {
      return initializeFirebase();
    } catch {
      // Firebase Client SDK may fail during SSR in some environments
      return null;
    }
  }, []);

  if (!firebaseValues) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider value={firebaseValues}>
      {children}
    </FirebaseProvider>
  );
}
