import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Loader2, Map as MapIcon, Navigation } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// Fix for default Leaflet marker icons in React
import 'leaflet/dist/leaflet.css';

// We create a custom HTML marker containing the photo thumbnail
const createCustomIcon = (thumbUrl) => {
    return L.divIcon({
        html: `
            <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden relative group">
                <img src="${thumbUrl}" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
            </div>
        `,
        className: 'custom-photo-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

// Component to dynamically adjust map bounds to fit all markers
const MapBoundsFitter = ({ photos }) => {
    const map = useMap();
    useEffect(() => {
        if (photos.length > 0) {
            const bounds = L.latLngBounds(photos.map(p => [p.location.lat, p.location.lng]));
            // Pad the bounds slightly and fly to them
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 1.5 });
        }
    }, [map, photos]);
    return null;
};

export default function MapView({ onPhotoSelect }) {
    const { token } = useAuthStore();
    const [mapData, setMapData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        setIsLoading(true);
        axios.get('/api/photos/map')
            .then(res => {
                if (res.data?.success) {
                    setMapData(res.data.data || []);
                }
            })
            .catch(err => console.error("Failed to fetch map data:", err))
            .finally(() => setIsLoading(false));
    }, [token]);

    const validPhotos = useMemo(() => {
        return mapData.filter(p => p.location && p.location.lat && p.location.lng);
    }, [mapData]);

    if (isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl">
                <Loader2 size={40} className="mb-4 animate-spin text-purple-500" />
                <p className="text-sm font-medium">GPS 위치 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (validPhotos.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                <MapIcon size={48} className="mb-4 opacity-50 text-indigo-400" />
                <p className="text-sm font-medium text-gray-500">위치 정보(GPS)가 포함된 사진이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-2 text-center max-w-[250px]">
                    스마트폰 설정에서 카메라 '위치 태그'를 켜고 사진을 찍으면 여기에 표시됩니다.
                </p>
            </div>
        );
    }

    // Default center to Seoul if validPhotos parsing fails unexpectedly, else arbitrary first photo
    const defaultCenter = [37.5665, 126.9780];

    return (
        <div className="flex flex-col h-full w-full bg-white relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Header / Stats Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                <Navigation size={18} className="text-indigo-600" />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 tracking-tight">발자취 지도</span>
                    <span className="text-[10px] text-gray-500 font-medium">총 {validPhotos.length}곳의 기록</span>
                </div>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={3}
                className="w-full h-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapBoundsFitter photos={validPhotos} />

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    spiderfyOnMaxZoom={true}
                    polygonOptions={{ fillOpacity: 0.2, color: '#6366f1', weight: 1 }}
                    iconCreateFunction={(cluster) => {
                        const count = cluster.getChildCount();
                        // Basic custom cluster icon
                        return L.divIcon({
                            html: `< div class="w-12 h-12 flex items-center justify-center bg-indigo-600/90 backdrop-blur-sm text-white font-bold rounded-full border-[3px] border-white shadow-lg shadow-indigo-500/30 text-sm ring-4 ring-indigo-100/50 transition-transform hover:scale-110" >
    ${count}
                                   </div > `,
                            className: 'custom-cluster-icon',
                            iconSize: L.point(48, 48, true),
                        });
                    }}
                >
                    {validPhotos.map((photo) => (
                        <Marker
                            key={photo.id}
                            position={[photo.location.lat, photo.location.lng]}
                            icon={createCustomIcon(photo.thumbUrl || photo.thumbnail_url)}
                        >
                            <Popup className="custom-photo-popup" minWidth={200}>
                                <div className="flex flex-col p-1 -m-1">
                                    <div
                                        className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-100 mb-2 cursor-pointer group"
                                        onClick={() => {
                                            // Close popup visually if needed, but primarily trigger full screen
                                            onPhotoSelect && onPhotoSelect(photo);
                                        }}
                                    >
                                        <img
                                            src={photo.thumbUrl || photo.thumbnail_url}
                                            alt={photo.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100">
                                            <span className="text-white text-xs font-bold drop-shadow-md border border-white/50 px-2 py-1 rounded bg-black/40 backdrop-blur-sm">크게 보기</span>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-800 text-sm truncate" title={photo.original_name || photo.name}>
                                        {photo.original_name || photo.name}
                                    </h4>

                                    <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        {photo.taken_at ? new Date(photo.taken_at).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '날짜 미상'}
                                    </div>

                                    {photo.metadata?.camera && (
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                                            <span>📷</span> {photo.metadata.camera}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Added custom style block targeting the popup to look seamless */}
            <style jsx="true">{`
    .leaflet - popup - content - wrapper {
    border - radius: 12px;
    box - shadow: 0 10px 25px - 5px rgba(0, 0, 0, 0.1), 0 8px 10px - 6px rgba(0, 0, 0, 0.1);
    padding: 0;
}
                .leaflet - popup - content {
    margin: 12px;
    line - height: 1.4;
}
                .custom - cluster - icon {
    background: transparent;
    border: none;
}
`}</style>
        </div>
    );
}
