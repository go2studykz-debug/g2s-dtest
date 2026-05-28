import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import path from 'path';
import { pdf, Font } from '@react-pdf/renderer';

// Register Roboto with Cyrillic support using filesystem paths (Node.js)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, result, analysis, answers, questions, logs, subjectScores } = body;

    let doc: React.ReactElement;

    if (type === 'analysis') {
      const { AiAnalysisPdf } = await import('@/components/pdf/ai-analysis-pdf');
      doc = React.createElement(AiAnalysisPdf, { result, analysis, subjectScores });
    } else {
      const { TestDetailsPdf } = await import('@/components/pdf/test-details-pdf');
      doc = React.createElement(TestDetailsPdf, { result, answers, questions, logs: logs ?? [] });
    }

    const buffer = await pdf(doc as any).toBuffer() as unknown as Buffer;
    const filename = type === 'analysis'
      ? `ai-analysis-${result.student_name}.pdf`
      : `test-details-${result.student_name}.pdf`;

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e: any) {
    console.error('PDF generation error:', e);
    return NextResponse.json({ error: e?.message || 'PDF generation failed' }, { status: 500 });
  }
}
