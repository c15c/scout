import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, venue, date, url } = await request.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('market_id')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('discoveries')
      .insert([
        {
          title,
          description: 'User-submitted listing',
          category: 'other',
          kind: 'dated',
          starts_on: date,
          venue_name: venue,
          source_url: url,
          confidence: 0.4,
          user_submitted: true,
          submitted_by: user.id,
          market_id: profile?.market_id,
          status: 'published'
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to import listing' }, { status: 500 });
  }
}
