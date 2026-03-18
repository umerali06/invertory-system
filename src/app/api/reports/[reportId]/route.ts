import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from '@/lib/session';

export async function GET(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reportId } = await params;
  const reportDoc = await adminDb.collection('reports').doc(reportId).get();

  if (!reportDoc.exists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const report = reportDoc.data() ?? {};
  const fileName = typeof report.fileName === 'string' ? report.fileName : `report-${reportId}.csv`;
  const csvContent = typeof report.csvContent === 'string' ? report.csvContent : '';

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
