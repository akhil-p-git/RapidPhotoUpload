import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AuthModalProvider } from './hooks/useAuthModal';
import { LoginModal } from './features/auth/components/LoginModal';
import { RegisterModal } from './features/auth/components/RegisterModal';
import { PrivateRoute } from './features/auth/components/PrivateRoute';
import { UploadPage } from './features/upload/UploadPage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { Navigation } from './components/Navigation';

function App() {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            <Navigation />
            <LoginModal />
            <RegisterModal />
            <Routes>
              <Route path="/" element={<Navigate to="/gallery" replace />} />
              <Route path="/login" element={<Navigate to="/gallery" replace />} />
              <Route path="/register" element={<Navigate to="/gallery" replace />} />
              <Route
                path="/upload"
                element={
                  <PrivateRoute>
                    <UploadPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/gallery"
                element={
                  <PrivateRoute>
                    <GalleryPage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthModalProvider>
    </AuthProvider>
  );
}

export default App;
