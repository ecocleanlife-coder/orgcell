import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import useAuthStore from './store/authStore';
import LoginButton from './components/auth/LoginButton';
import PhotoUploader from './components/gallery/PhotoUploader';
import GalleryGrid from './components/gallery/GalleryGrid';
import FaceRegistration from './components/face/FaceRegistration';
import AlbumView from './components/gallery/AlbumView';
import FriendCall from './components/sync/FriendCall';
import RoomWorkspace from './components/sync/RoomWorkspace';
import KeyManager from './components/settings/KeyManager';
import useCryptoStore from './store/cryptoStore';

function Layout({ children }) {
  const [photos, setPhotos] = useState([]);
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const registeredFaces = useAuthStore(state => state.registeredFaces);
  const fetchRegisteredFaces = useAuthStore(state => state.fetchRegisteredFaces);
  const workerRef = useRef(null);

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
    <div className="min-h-screen flex flex-col items-center w-full max-w-7xl mx-auto p-4 md:p-8">
      {/* Header & Title Section */}
      <header className="w-full text-center border-b pb-6 mb-8 mt-4 relative">
        <div className="absolute right-0 top-0 text-sm flex items-center gap-4">
          <span className="text-gray-500">{user?.name}님 환영합니다</span>
          <button onClick={logout} className="text-blue-600 hover:underline">로그아웃</button>
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
      <main className="w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Column (AI Chronicle & Settings) */}
        <div className="w-full md:w-1/4 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-4 min-h-[400px]">
            <h2 className="text-lg font-bold border-b pb-2 mb-4 text-center">AI Chronicle</h2>
            <div className="flex flex-col items-center justify-center h-full">
              <FaceRegistration onRegisterComplete={() => console.log('Face registered')} />
            </div>
          </div>

          <KeyManager />
        </div>

        {/* Center Column (Workspace) */}
        <div className="w-full md:w-2/4 bg-white rounded-xl shadow-sm border p-4 min-h-[500px] flex flex-col gap-4">
          <h2 className="text-lg font-bold border-b pb-2 text-center">Workspace (Gallery)</h2>
          <PhotoUploader
            onUploadComplete={(newPhotos) => {
              setPhotos((prev) => {
                const uniqueNewPhotos = newPhotos.filter(np =>
                  !prev.some(p => p.dHash === np.dHash) // Deduplication check
                );

                if (newPhotos.length > uniqueNewPhotos.length) {
                  const dupes = newPhotos.length - uniqueNewPhotos.length;
                  alert(`중복된 사진 ${dupes}장은 제외되었습니다.`);
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
        <div className="w-full md:w-1/4 bg-white rounded-xl shadow-sm border p-4 min-h-[500px] flex flex-col">
          <FriendCall />
          <RoomWorkspace workerRef={workerRef} localPhotos={photos} />

          <div className="mt-8 pt-4 border-t border-dashed">
            <AlbumView />
          </div>
        </div>
      </main>
    </div>
  );
}

function LandingPage() {
  const devLogin = useAuthStore(state => state.devLogin);
  const isLoading = useAuthStore(state => state.isLoading);
  const [name, setName] = React.useState('Test User');
  const [email, setEmail] = React.useState('test@orgcell.com');

  const handleDevLogin = () => {
    devLogin(name, email);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Memoir Lens</h1>
        <p className="text-gray-600 mb-8">가족의 역사를 안전하게 보관하세요.</p>

        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-8 text-sm text-left">
          <ul className="list-disc list-inside space-y-2">
            <li>서버에 원본 사진을 저장하지 않는 Zero-Storage 구조</li>
            <li>브라우저 내장 AI 얼굴 인식 및 분류</li>
            <li>다이렉트 보안 P2P 공유 룸</li>
          </ul>
        </div>

        <div className="space-y-4 border-b pb-6 mb-6">
          <p className="text-sm font-bold text-gray-500">Google OAuth (Phase 3)</p>
          <LoginButton />
        </div>

        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
          <p className="text-sm font-bold text-gray-500">Developer Mock Login</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Name"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Email"
          />
          <button
            onClick={handleDevLogin}
            disabled={isLoading}
            className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white rounded font-medium disabled:opacity-50 cursor-pointer"
          >
            Mock Login 테스트
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const token = useAuthStore(state => state.token);
  const fetchMe = useAuthStore(state => state.fetchMe);

  React.useEffect(() => {
    fetchMe();
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
