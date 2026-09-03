'use client';

import AppShell from '@/components/AppShell';
import Feed from '@/components/Feed';

/**
 * Root route: the app is the feed of what is on.
 * No landing page. Onboarding is a one-time sheet rendered by AppShell, skippable.
 */
export default function Home() {
  return (
    <AppShell>
      <Feed />
    </AppShell>
  );
}
