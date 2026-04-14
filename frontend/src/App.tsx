import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { AppLayout } from '@/components/AppLayout';
import { ProjectListPage } from '@/features/projects/ProjectListPage';

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
                      {/* Placeholder routes for later phases */}
                      <Route
                        path="/projects/new"
                        element={<Placeholder label="New Project" />}
                      />
                      <Route
                        path="/projects/:id"
                        element={<Placeholder label="Project Detail" />}
                      />
                      <Route
                        path="/projects/:projectId/elements/:elementId"
                        element={<Placeholder label="Element Detail" />}
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
