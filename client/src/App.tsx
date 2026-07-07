import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/routes/public/Landing';
import { LoginPage } from '@/routes/public/Login';
import { SignupPage } from '@/routes/public/Signup';
import { CompleteSignupPage } from '@/routes/public/CompleteSignup';
import { PendingApprovalPage } from '@/routes/charity/PendingApproval';

import { PersonHome } from '@/routes/person/Home';
import { PostItemPage } from '@/routes/person/PostItem';
import { MyItemsPage } from '@/routes/person/MyItems';
import { ItemDetailPage } from '@/routes/shared/ItemDetail';
import { CharityMapPage } from '@/routes/person/CharityMap';

import { CharityHome } from '@/routes/charity/Home';
import { ItemsFeedPage } from '@/routes/charity/ItemsFeed';
import { ItemsMapPage } from '@/routes/charity/ItemsMap';
import { WishlistPage } from '@/routes/charity/Wishlist';

import { ChatPage } from '@/routes/shared/Chat';
import { NotificationsPage } from '@/routes/shared/Notifications';
import { ProfilePage } from '@/routes/shared/Profile';
import { SettingsPage } from '@/routes/shared/Settings';

import { AdminApprovalsPage } from '@/routes/admin/Approvals';
import { AdminUsersPage } from '@/routes/admin/Users';

function HomeRouter() {
  const { firebaseUser, user, claims, loading } = useAuth();
  // Still resolving the session (e.g. right after sign-in) — don't flash the
  // landing page, which looks like the login "bounced" back to the homepage.
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!firebaseUser) return <LandingPage />;
  // Admins are routed off their claims alone.
  if (claims?.role === 'admin') return <Navigate to="/admin/approvals" replace />;
  // Signed in with Firebase but no profile: show the landing page, never a
  // forced redirect. A stale session (or a profile fetch that merely failed)
  // must not hijack the home URL into the signup flow; the landing page shows
  // a finish-signup banner when the profile is definitively missing.
  if (!user) return <LandingPage />;
  if (claims?.role === 'charity' && !claims.approved)
    return <Navigate to="/pending-approval" replace />;
  if (claims?.role === 'charity') return <CharityHome />;
  return <PersonHome />;
}

function RequireAuth({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'person' | 'charity' | 'admin';
}) {
  const { user, claims, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!user || !claims) return <Navigate to="/login" replace />;
  if (role && claims.role !== role)
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/complete-signup" element={<CompleteSignupPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRouter />} />

        {/* Person */}
        <Route
          path="/post"
          element={
            <RequireAuth role="person">
              <PostItemPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-items"
          element={
            <RequireAuth role="person">
              <MyItemsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/charities"
          element={
            <RequireAuth role="person">
              <CharityMapPage />
            </RequireAuth>
          }
        />

        {/* Charity */}
        <Route
          path="/feed"
          element={
            <RequireAuth role="charity">
              <ItemsFeedPage />
            </RequireAuth>
          }
        />
        <Route
          path="/map"
          element={
            <RequireAuth role="charity">
              <ItemsMapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/wishlist"
          element={
            <RequireAuth role="charity">
              <WishlistPage />
            </RequireAuth>
          }
        />

        {/* Shared */}
        <Route
          path="/items/:itemId"
          element={
            <RequireAuth>
              <ItemDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/inbox"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/inbox/:threadId"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/approvals"
          element={
            <RequireAuth role="admin">
              <AdminApprovalsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth role="admin">
              <AdminUsersPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
