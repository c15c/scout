import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);

    // Single discovery lookup (detail view).
    if (id) {
      const { data, error } = await supabase
        .from('discoveries')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Upcoming only - a finished event must never appear in the feed.
    // weekly/venue items are recurring and always current; dated/season items
    // qualify while their last day (ends_on, or starts_on when single-day)
    // is today or later.
    const today = new Date().toISOString().slice(0, 10);
    const upcoming =
      'kind.in.(weekly,venue),ends_on.gte.' + today +
      ',and(ends_on.is.null,starts_on.gte.' + today + ')';

    const { data, error } = await supabase
      .from('discoveries')
      .select('*')
      .eq('status', 'published')
      .or(upcoming)
      .order('starts_on', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch discoveries' }, { status: 500 });
  }
}
