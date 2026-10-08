import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { SectionRenderer } from '@/components/site/sections';

// Content comes from the admin Site editor (siteContent/published), falling
// back to the built-in defaults in @charity-net/shared.
export function LandingPage() {
  const { firebaseUser, user, profileStatus } = useAuth();
  const content = useSiteContent();
  // Signed in but onboarding never finished: offer the way back in without
  // hijacking the page (HomeRouter deliberately no longer force-redirects).
  const showFinishSignup = Boolean(firebaseUser) && !user && profileStatus === 'missing';
  return (
    <div>
      {showFinishSignup && (
        <div className="border-b bg-sun/15 px-4 py-2.5 text-center text-sm">
          You're signed in but your account isn't set up yet.{' '}
          <Link to="/complete-signup" className="font-semibold text-primary underline underline-offset-2">
            Finish signup
          </Link>
        </div>
      )}
      {content.landing.sections
        .filter((s) => !s.hidden)
        .map((s) => (
          <SectionRenderer key={s.id} section={s} />
        ))}
    </div>
  );
}
