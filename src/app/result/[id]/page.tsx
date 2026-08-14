'use client';

// The participant (parent) result page reuses the EXACT admin result view so
// the design and all sections (поведение, ошибки, стратегия, обзор) match 1:1.
// `readOnly` hides admin-only controls (session control, WhatsApp resend,
// PDF export, proctoring log) while keeping the score, class comparison,
// admission chances and the full AI analysis.
import ResultDetails from '@/app/admin/results/[id]/ResultDetails';

export default function ParticipantResultPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResultDetails params={params} readOnly />;
}
