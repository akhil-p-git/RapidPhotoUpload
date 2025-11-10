import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { galleryApi, PhotoResponse, PhotoFilters } from '../../api/gallery';
import { Lightbox } from './components/Lightbox';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../auth/AuthContext';
import { useAuthModal } from '../../hooks/useAuthModal';

const PAGE_SIZE = 24;

export const GalleryPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { openLogin } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [photos, setPhotos] = useState<PhotoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toasts, removeToast, success } = useToast();
  
  const [filters, setFilters] = useState<PhotoFilters>(() => {
    const params: PhotoFilters = {};
    if (searchParams.get('search')) params.search = searchParams.get('search') || undefined;
    if (searchParams.get('status')) params.status = searchParams.get('status') || undefined;
    return { status: 'COMPLETED', sortBy: 'uploadedAt', sortOrder: 'desc', ...params };
  });

  const updateFilters = useCallback((newFilters: PhotoFilters) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status) params.set('status', newFilters.status);
    setSearchParams(params, { replace: true });
  }, [setSearchParams, isAuthenticated, openLogin]);

  const loadPhotos = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!user || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const response = await galleryApi.getPhotos(page, PAGE_SIZE, filters);

      if (append) {
        setPhotos((prev) => [...prev, ...response.content]);
      } else {
        setPhotos(response.content);
      }

      setCurrentPage(response.currentPage);
      setHasMore(response.hasNext);
    } catch (err: any) {
      setError(err.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, filters]);

  const loadMorePhotos = useCallback(() => {
    if (!loading && hasMore && isAuthenticated) {
      loadPhotos(currentPage + 1, true);
    }
  }, [loading, hasMore, currentPage, loadPhotos, isAuthenticated]);

  const lastPhotoElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || !isAuthenticated) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMorePhotos();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadMorePhotos, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPhotos(0, false);
    } else {
      setPhotos([]);
    }
  }, [loadPhotos, isAuthenticated]);

  const handlePhotoClick = (photo: PhotoResponse) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    const index = photos.findIndex((p) => p.id === photo.id);
    setSelectedIndex(index);
    setSelectedPhoto(photo);
  };

  const handleCloseLightbox = () => {
    setSelectedPhoto(null);
  };

  const handleNextPhoto = () => {
    if (selectedIndex < photos.length - 1) {
      const nextIndex = selectedIndex + 1;
      setSelectedIndex(nextIndex);
      setSelectedPhoto(photos[nextIndex]);
    }
  };

  const handlePreviousPhoto = () => {
    if (selectedIndex > 0) {
      const prevIndex = selectedIndex - 1;
      setSelectedIndex(prevIndex);
      setSelectedPhoto(photos[prevIndex]);
    }
  };

  const handleSearchClick = () => {
    if (!isAuthenticated) {
      openLogin();
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openLogin();
    }
  };

  const landscapeBg = {
    background: 'linear-gradient(180deg, #FFE5D4 0%, #FFD4B3 25%, #B8E6B8 50%, #A8D8A8 75%, #98C898 100%)',
    minHeight: '100vh',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; }
        .gallery-container { position: relative; z-index: 10; min-height: 100vh; }
        .hero-section { padding-top: 128px; padding-bottom: 80px; padding-left: 32px; padding-right: 32px; }
        .hero-title { font-size: 4rem; font-weight: 700; color: white; margin-bottom: 24px; line-height: 1.1; letter-spacing: -0.02em; }
        .hero-subtitle { font-size: 1.5rem; color: rgba(255,255,255,0.9); max-width: 42rem; line-height: 1.6; }
        .search-container { padding: 0 32px 48px 32px; }
        .search-input { width: 100%; padding: 16px 24px; background: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; font-size: 1.125rem; cursor: ${isAuthenticated ? 'text' : 'pointer'}; }
        .search-input:focus { outline: none; border-color: rgba(255,255,255,0.5); }
        .search-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .search-prompt { text-align: center; margin-top: 12px; color: rgba(255,255,255,0.8); font-size: 0.875rem; }
        .photo-grid-container { padding: 0 32px 80px 32px; }
        .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 1280px; margin: 0 auto; }
        @media (min-width: 768px) { .photo-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .photo-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1280px) { .photo-grid { grid-template-columns: repeat(5, 1fr); } }
        .photo-item { aspect-ratio: 1; border-radius: 16px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); transition: transform 0.3s; }
        .photo-item:hover { transform: scale(1.05); }
        .photo-item img { width: 100%; height: 100%; object-fit: cover; }
        .loading { display: flex; align-items: center; justify-content: center; padding: 128px 0; }
        .spinner { width: 64px; height: 64px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { display: flex; align-items: center; justify-content: center; padding: 128px 0; text-align: center; }
        .empty-title { font-size: 1.5rem; color: white; margin-bottom: 16px; }
        .empty-text { color: rgba(255,255,255,0.7); margin-bottom: 32px; }
        .btn-primary { display: inline-block; padding: 16px 32px; background: rgba(255,255,255,0.9); color: #1f2937; border-radius: 8px; font-weight: 500; text-decoration: none; transition: background 0.2s; cursor: pointer; border: none; }
        .btn-primary:hover { background: white; }
      `}</style>
      
      <div style={landscapeBg}></div>
      
      <div className="gallery-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <h1 className="hero-title">Your digital gallery</h1>
            <p className="hero-subtitle">
              Organize, discover, and relive your memories with intelligent photo management.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder={isAuthenticated ? "Search your photos..." : "Sign in to search your photos"}
              value={isAuthenticated ? (filters.search || '') : ''}
              onChange={(e) => {
                if (isAuthenticated) {
                  updateFilters({ ...filters, search: e.target.value || undefined });
                }
              }}
              onClick={handleSearchClick}
              disabled={!isAuthenticated}
              className="search-input"
            />
            {!isAuthenticated && (
              <p className="search-prompt">Sign in to search and manage your photos</p>
            )}
          </div>
        </div>

        {/* Photo Grid */}
        {!isAuthenticated ? (
          <div className="empty-state">
            <div>
              <p className="empty-title">Sign in to view your gallery</p>
              <p className="empty-text">Create an account or sign in to start organizing your photos</p>
              <button onClick={openLogin} className="btn-primary">
                Sign In
              </button>
            </div>
          </div>
        ) : loading && photos.length === 0 ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : error && photos.length === 0 ? (
          <div className="empty-state">
            <div>
              <p className="empty-title">Error loading photos</p>
              <button onClick={() => loadPhotos(0, false)} className="btn-primary" style={{ marginTop: '16px' }}>
                Try Again
              </button>
            </div>
          </div>
        ) : photos.length > 0 ? (
          <div className="photo-grid-container">
            <div className="photo-grid">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  ref={index === photos.length - 1 ? lastPhotoElementRef : null}
                  onClick={() => handlePhotoClick(photo)}
                  className="photo-item"
                >
                  <img
                    src={`http://localhost:8080/api/photos/${photo.id}/file?size=medium`}
                    alt={photo.originalFileName}
                  />
                </div>
              ))}
            </div>

            {loading && photos.length > 0 && (
              <div className="loading">
                <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
              </div>
            )}

            {!hasMore && photos.length > 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.6)' }}>
                You've reached the end
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <p className="empty-title">No photos yet</p>
              <p className="empty-text">Start uploading to build your gallery</p>
              <a href="/upload" onClick={handleUploadClick} className="btn-primary">
                Upload Photos
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && isAuthenticated && (
        <Lightbox
          photo={selectedPhoto}
          photos={photos}
          currentIndex={selectedIndex}
          onClose={handleCloseLightbox}
          onNext={handleNextPhoto}
          onPrevious={handlePreviousPhoto}
          onDelete={() => {
            setPhotos((prev) => prev.filter((p) => p.id !== selectedPhoto.id));
            setSelectedPhoto(null);
            success('Photo deleted');
          }}
        />
      )}
    </>
  );
};
