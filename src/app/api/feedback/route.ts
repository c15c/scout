import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { discoveryId, type, context } = await request.json();

    const { error } = await supabase
      .from('user_feedback')
      .insert([
        {
          user_id: user.id,
          discovery_id: discoveryId,
          type,
          context
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}
