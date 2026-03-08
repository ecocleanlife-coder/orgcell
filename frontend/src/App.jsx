import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon, Users, RefreshCcw, Settings } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

import useAuthStore from './store/authStore';
import useUiStore, { initTheme } from './store/uiStore';
import PhotoUploader from './components/gallery/PhotoUploader';
import GalleryGrid from './components/gallery/GalleryGrid';
import FaceRegistration from './components/face/FaceRegistration';
import AlbumView from './components/gallery/AlbumView';
import FriendCall from './components/sync/FriendCall';
import RoomWorkspace from './components/sync/RoomWorkspace';
import KeyManager from './components/settings/KeyManager';
import useCryptoStore from './store/cryptoStore';
import LandingPage from './components/home/LandingPage';

function Layout({ children }) {
  const [photos, setPhotos] = useState([]);
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const registeredFaces = useAuthStore(state => state.registeredFaces);
  const fetchRegisteredFaces = useAuthStore(state => state.fetchRegisteredFaces);
  const workerRef = useRef(null);
  const { activeTab, setActiveTab } = useUiStore();

  useEffect(() => {
    fetchRegisteredFaces();
    useCryptoStore.getState().initKey();

    // Initialize Web Worker
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

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [fetchRegisteredFaces]);

  useEffect(() => {
    if (workerRef.current && registeredFaces) {
      workerRef.current.postMessage({ type: 'SET_LABELS', payload: registeredFaces });
    }
  }, [registeredFaces]);

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
        {/* Left Column (AI Chronicle & Settings) */}
        <div className={`w-full md:w-1/4 flex-col gap-6 ${activeTab === 'people' || activeTab === 'settings' ? 'flex' : 'hidden md:flex'}`}>
          <div className={`bg-white rounded-xl shadow-sm border p-4 min-h-[400px] ${activeTab === 'people' ? 'block' : 'hidden md:block'}`}>
            <h2 className="text-lg font-bold border-b pb-2 mb-4 text-center">AI Chronicle</h2>
            <div className="flex flex-col items-center justify-center h-full">
              <FaceRegistration onRegisterComplete={() => console.log('Face registered')} />
            </div>
          </div>

          <div className={`${activeTab === 'settings' ? 'block' : 'hidden md:block'}`}>
            <KeyManager />
          </div>
        </div>

        {/* Center Column (Workspace) */}
        <div className={`w-full md:w-2/4 bg-white rounded-xl shadow-sm border p-4 min-h-[500px] flex-col gap-4 ${activeTab === 'gallery' ? 'flex' : 'hidden md:flex'}`}>
          <h2 className="text-lg font-bold border-b pb-2 text-center">Workspace (Gallery)</h2>
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
          <div className="flex-1 overflow-y-auto">
            <GalleryGrid photos={photos} />
          </div>
        </div>

        {/* Right Column (Global Sync) */}
        <div className={`w-full md:w-1/4 bg-white rounded-xl shadow-sm border p-4 min-h-[500px] flex-col ${activeTab === 'sync' ? 'flex' : 'hidden md:flex'}`}>
          <FriendCall />
          <RoomWorkspace workerRef={workerRef} localPhotos={photos} />

          <div className="mt-8 pt-4 border-t border-dashed">
            <AlbumView />
          </div>
        </div>
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
        <Route path="/" element={token ? <Layout /> : <LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
