import { INGEST_SECRET } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${INGEST_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement full ingestion pipeline
    // 1. Fetch sources (tier: aggregator, social, manual)
    // 2. Run adapters for each source
    // 3. Extract with LLM
    // 4. Geocode
    // 5. Dedupe
    // 6. Gate
    // 7. Publish or suppress

    return NextResponse.json({
      status: 'ingestion_complete',
      message: 'Scheduled ingestion pipeline not yet implemented'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
  }
}
