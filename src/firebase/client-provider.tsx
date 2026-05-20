'use client';

import React, { useMemo, ReactNode } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseValues = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider value={firebaseValues}>
      {children}
    </FirebaseProvider>
  );
}
