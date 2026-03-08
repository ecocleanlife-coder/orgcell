import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon, Users, RefreshCcw, Settings } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

import useAuthStore from './store/authStore';
import useUiStore, { initTheme } from './store/uiStore';
import useCryptoStore from './store/cryptoStore';

// Lazy loading heavy components for performance code-splitting
const GalleryGrid = lazy(() => import('./components/gallery/GalleryGrid'));
const TimelineView = lazy(() => import('./components/gallery/TimelineView'));
const MapView = lazy(() => import('./components/gallery/MapView'));
const FaceRegistration = lazy(() => import('./components/face/FaceRegistration'));
const AlbumView = lazy(() => import('./components/gallery/AlbumView'));
const PhotoViewer = lazy(() => import('./components/gallery/PhotoViewer'));
const FriendCall = lazy(() => import('./components/sync/FriendCall'));
const RoomWorkspace = lazy(() => import('./components/sync/RoomWorkspace'));
const KeyManager = lazy(() => import('./components/settings/KeyManager'));
const LandingPage = lazy(() => import('./components/home/LandingPage'));
const DriveCallback = lazy(() => import('./components/settings/DriveCallback'));

// A Loading Fallback Component
const PageLoader = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

const PhotoUploader = lazy(() => import('./components/gallery/PhotoUploader'));

function Layout({ children }) {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [galleryView, setGalleryView] = useState('grid');
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const registeredFaces = useAuthStore(state => state.registeredFaces);
  const fetchRegisteredFaces = useAuthStore(state => state.fetchRegisteredFaces);
  const workerRef = useRef(null);
  const { activeTab, setActiveTab } = useUiStore();

  // Initialize worker only once when needed
  useEffect(() => {
    if (activeTab === 'gallery' || activeTab === 'people') {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./workers/faceScanWorker.js', import.meta.url), { type: 'module' });
        workerRef.current.postMessage({ type: 'INIT', payload: { origin: window.location.origin } });

        workerRef.current.onmessage = (e) => {
          const { type, payload } = e.data;
          if (type === 'STATUS') console.log('[Worker]', payload);
          if (type === 'ERROR') console.error('[Worker Error]', payload);
          if (type === 'SCAN_COMPLETE') {
            console.log('[Worker Scan Result]', payload);
            // Post result to backend
            axios.post('/api/face/detect-result', {
              photo_id: payload.imageId,
              faces: payload.faces
            }).catch(() => console.warn('Mock: /api/face/detect-result not ready yet'));
          }
        };
      }
    }

    return () => {
      // Don't terminate on unmount, we want the background processing to continue between tabs
    };
  }, [activeTab]);

  useEffect(() => {
    fetchRegisteredFaces();
    useCryptoStore.getState().initKey();

    const handleOffline = () => toast.error('인터넷 연결이 끊어졌습니다. 오프라인 모드로 전환됩니다.', { id: 'offline-toast', duration: 5000 });
    const handleOnline = () => toast.success('인터넷 연결이 복구되었습니다.', { id: 'online-toast' });

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchRegisteredFaces]);

  useEffect(() => {
    if (workerRef.current && registeredFaces) {
      workerRef.current.postMessage({ type: 'SET_LABELS', payload: registeredFaces });
    }
  }, [registeredFaces]);

  const handleDeletePhoto = async (photoToDelete) => {
    try {
      // 1. Delete from Drive if connected
      const { driveConnected } = useAuthStore.getState();
      if (driveConnected) {
        if (photoToDelete.drive_thumbnail_id) {
          await axios.delete(`/api/drive/file/${photoToDelete.drive_thumbnail_id}`).catch(console.warn);
        }
        if (photoToDelete.drive_file_id) {
          await axios.delete(`/api/drive/file/${photoToDelete.drive_file_id}`).catch(console.warn);
        }
      }

      // 2. Delete from DB (if it exists remotely)
      if (photoToDelete.id) {
        await axios.delete(`/api/photos/${photoToDelete.id}`);
      }

      // 3. Remove locally
      setPhotos(prev => prev.filter(p => p !== photoToDelete));
      setSelectedPhoto(null);
      toast.success('사진이 영구 삭제되었습니다.');
    } catch (err) {
      console.error('Failed to delete photo', err);
      toast.error('사진을 삭제하는 중 오류가 발생했습니다.');
    }
  };

  // Fetch photos from DB when user enters the gallery tab
  useEffect(() => {
    if (activeTab === 'gallery' && token) {
      axios.get('/api/photos')
        .then(res => {
          if (res.data?.success) {
            setPhotos(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch photos from DB', err));
    }
  }, [activeTab, token]);

  return (
    <div className="min-h-screen flex flex-col items-center w-full max-w-7xl mx-auto p-4 md:p-8 transition-colors duration-200 dark:bg-gray-900">
      <Toaster position="top-right" />
      {/* Header & Title Section */}
      <header className="w-full text-center border-b dark:border-gray-700 pb-6 mb-8 mt-4 relative">
        <div className="absolute right-0 top-0 text-sm flex items-center gap-4">
          <span className="text-gray-500 dark:text-gray-400">{user?.name}님 환영합니다</span>
          <button onClick={logout} className="text-blue-600 dark:text-blue-400 hover:underline">로그아웃</button>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-2">
          Memoir Lens
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium mb-4">
          엉클어진 추억을 질서있게
        </p>
        <div className="bg-gray-100 rounded-lg p-3 inline-block">
          <p className="text-sm font-semibold text-gray-700">
            🔒 고객보호를 위해 본 앱에는 사진을 보관하는 기능이 없습니다 (Your photos never leave your device)
          </p>
        </div>

        {/* Navigation Buttons (Always Visible) */}
        <nav className="flex flex-col md:flex-row gap-4 mt-8 justify-center">
          <button className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-sm transition-colors cursor-pointer">
            추억을 영원히
          </button>
          <button className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-sm transition-colors cursor-pointer">
            추억을 질서있게
          </button>
          <button className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg shadow-sm transition-colors cursor-pointer">
            추억을 나눕니다
          </button>
        </nav>
      </header>

      {/* Main Workspace Area */}
      <main className="w-full flex-1 flex flex-col md:flex-row gap-6 pb-20 md:pb-6">
        <Suspense fallback={<PageLoader />}>
          {/* Left Column (AI Chronicle & Settings) */}
          <div className={`w-full md:w-1/4 flex-col gap-6 ${activeTab === 'people' || activeTab === 'settings' ? 'flex' : 'hidden md:flex'}`}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 min-h-[400px] ${activeTab === 'people' ? 'block' : 'hidden md:block'}`}>
              <h2 className="text-lg font-bold border-b dark:border-gray-700 pb-2 mb-4 text-center dark:text-gray-100">AI Chronicle</h2>
              <div className="flex flex-col items-center justify-center h-full">
                <FaceRegistration onRegisterComplete={() => console.log('Face registered')} />
              </div>
            </div>

            <div className={`${activeTab === 'settings' ? 'block' : 'hidden md:block'}`}>
              <KeyManager />
            </div>
          </div>

          {/* Center Column (Workspace) */}
          <div className={`w-full md:w-2/4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 min-h-[500px] flex-col gap-4 ${activeTab === 'gallery' ? 'flex' : 'hidden md:flex'}`}>
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
              <h2 className="text-lg font-bold dark:text-gray-100">Workspace (Gallery)</h2>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg shadow-inner">
                <button
                  onClick={() => setGalleryView('grid')}
                  className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${galleryView === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  그리드
                </button>
                <button
                  onClick={() => setGalleryView('timeline')}
                  className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${galleryView === 'timeline' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  타임라인
                </button>
                <button
                  onClick={() => setGalleryView('map')}
                  className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${galleryView === 'map' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  지도
                </button>
              </div>
            </div>

            <PhotoUploader
              onUploadComplete={(newPhotos) => {
                setPhotos((prev) => {
                  const uniqueNewPhotos = newPhotos.filter(np =>
                    !prev.some(p => p.dHash === np.dHash) // Deduplication check
                  );

                  if (newPhotos.length > uniqueNewPhotos.length) {
                    const dupes = newPhotos.length - uniqueNewPhotos.length;
                    toast.error(`중복된 사진 ${dupes}장은 업로드 제외되었습니다.`);
                  }

                  if (uniqueNewPhotos.length > 0) {
                    toast.success(`새 사진 ${uniqueNewPhotos.length}장 처리 완료!`);
                  }

                  const updatedList = [...prev, ...uniqueNewPhotos];

                  // Send only the unique new photos to the face-api background worker
                  uniqueNewPhotos.forEach((photo, idx) => {
                    if (workerRef.current) {
                      workerRef.current.postMessage({
                        type: 'SCAN_IMAGE',
                        payload: {
                          imageId: photo.name + '_' + Date.now() + '_' + idx,
                          dataUrl: photo.thumbUrl
                        }
                      });
                    }
                  });

                  return updatedList;
                });
              }}
            />
            <div className="flex-1 overflow-y-auto mb-2 custom-scrollbar">
              {galleryView === 'grid' && (
                <GalleryGrid
                  photos={photos}
                  onPhotoSelect={(photo) => setSelectedPhoto(photo)}
                />
              )}
              {galleryView === 'timeline' && (
                <TimelineView
                  onPhotoSelect={(photo) => setSelectedPhoto(photo)}
                />
              )}
              {galleryView === 'map' && (
                <MapView
                  onPhotoSelect={(photo) => setSelectedPhoto(photo)}
                />
              )}
            </div>
          </div>

          {/* Right Column (Global Sync) */}
          <div className={`w-full md:w-1/4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 min-h-[500px] flex-col ${activeTab === 'sync' ? 'flex' : 'hidden md:flex'}`}>
            <FriendCall localPhotos={photos} />
            <RoomWorkspace workerRef={workerRef} localPhotos={photos} />

            <div className="mt-8 pt-4 border-t dark:border-gray-700 border-dashed">
              <AlbumView />
            </div>

            {/* Full Screen Photo Viewer Modal */}
            {selectedPhoto && (
              <PhotoViewer
                photo={selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                onDeleteClick={handleDeletePhoto}
              />
            )}
          </div>
        </Suspense>
      </main>

      {/* Mobile Tab Bar (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('gallery')} className={`flex flex-col items-center ${activeTab === 'gallery' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <ImageIcon size={24} />
          <span className="text-[10px] mt-1 font-medium">갤러리</span>
        </button>
        <button onClick={() => setActiveTab('people')} className={`flex flex-col items-center ${activeTab === 'people' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Users size={24} />
          <span className="text-[10px] mt-1 font-medium">인물</span>
        </button>
        <button onClick={() => setActiveTab('sync')} className={`flex flex-col items-center ${activeTab === 'sync' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <RefreshCcw size={24} />
          <span className="text-[10px] mt-1 font-medium">공유</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-medium">설정</span>
        </button>
      </div>
    </div>
  );
}

function App() {
  const token = useAuthStore(state => state.token);
  const fetchMe = useAuthStore(state => state.fetchMe);

  React.useEffect(() => {
    fetchMe();
    initTheme();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Layout />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <LandingPage />
              </Suspense>
            )
          }
        />
        <Route
          path="/drive-callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <DriveCallback />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
