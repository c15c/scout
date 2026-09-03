import AppShell from "@/components/AppShell";
import Feed from "@/components/Feed";

/**
 * There is no landing page. The root route is the app: the feed of what is on.
 * Onboarding is a one-time sheet rendered over the feed by AppShell, and can be
 * re-run later from the profile menu.
 */
export default function Home() {
  return (
    <AppShell>
      <Feed />
    </AppShell>
  );
}
