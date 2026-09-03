import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await request.json();

    // TODO: Fetch and parse the linked page
    // For now, return a stub
    return NextResponse.json({
      title: 'Pasted link',
      description: 'Page content to be extracted',
      url
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to parse link' }, { status: 500 });
  }
}
