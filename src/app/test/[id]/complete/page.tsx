
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from 'lucide-react';

export default function CompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md animate-in zoom-in-95 duration-500">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-headline font-bold">Assessment Complete</h1>
        <p className="text-muted-foreground text-lg">
          Your test has been successfully submitted and is being processed by our scoring engine. You can now close this window or return to home.
        </p>
        <div className="pt-8">
          <Button variant="outline" onClick={() => router.push('/')} className="h-12 px-8">
            <Home className="w-4 h-4 mr-2" />
            Return to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
