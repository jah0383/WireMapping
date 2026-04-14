import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { AppLayout } from '@/components/AppLayout';
import { ProjectListPage } from '@/features/projects/ProjectListPage';
import { ProjectCreatePage } from '@/features/projects/ProjectCreatePage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { ElementDetailPage } from '@/features/elements/ElementDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="dark">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <AppLayout>
                    <Routes>
                      <Route path="/projects" element={<ProjectListPage />} />
                      <Route path="/projects/new" element={<ProjectCreatePage />} />
                      <Route path="/projects/:id" element={<ProjectDetailPage />} />
                      <Route
                        path="/projects/:projectId/elements/:elementId"
                        element={<ElementDetailPage />}
                      />
                      <Route
                        path="/projects/:projectId/wires/new"
                        element={<Placeholder label="Wire Entry" />}
                      />
                      <Route path="*" element={<Navigate to="/projects" replace />} />
                    </Routes>
                  </AppLayout>
                </AuthGuard>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">{label} - coming soon</p>
    </div>
  );
}

export default App;
