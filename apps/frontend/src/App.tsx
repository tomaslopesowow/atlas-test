import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { AdminPage } from './pages/AdminPage';
import { FeedPage } from './pages/FeedPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PostPage } from './pages/PostPage';
import { ProfilePage } from './pages/ProfilePage';

function Pages() {
    const { me, loading, can } = useAuth();

    if (loading)
        return (
            <div className="flex min-h-dvh items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );

    // signed out, every address shows the sign-in page, and the user lands back on it after
    if (!me) return <LoginPage />;

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<FeedPage />} />
                <Route path="posts/:id" element={<PostPage />} />
                <Route path="users/:id" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                {can('read:roles') && (
                    <Route path="admin" element={<AdminPage />} />
                )}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <Pages />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
