/**
 * FeaturePanel.jsx — 자료실 우측 버튼 패널
 *
 * 4개 기능 버튼을 세로로 배치:
 * - 사진 불러오기
 * - 게시판
 * - 육성녹음
 * - 초대하기
 *
 * 관장(owner) 전용:
 * - 요청 관리 (접근 요청 승인/거절)
 */
import React from 'react';
import { Image, MessageSquare, Mic, UserPlus, Shield } from 'lucide-react';

const FEATURES = [
    { key: 'photo', label: '사진 불러오기', icon: Image, color: '#3498db', bg: '#ebf5fb' },
    { key: 'board', label: '게시판', icon: MessageSquare, color: '#9b59b6', bg: '#f5eef8' },
    { key: 'voice', label: '육성녹음', icon: Mic, color: '#e74c3c', bg: '#fdedec' },
    { key: 'invite', label: '초대하기', icon: UserPlus, color: '#2ecc71', bg: '#eafaf1' },
];

const OWNER_FEATURES = [
    { key: 'access_requests', label: '요청 관리', icon: Shield, color: '#C4A84F', bg: '#FAFAF2' },
];

/**
 * @param {function} onFeatureClick - (featureKey) => void
 * @param {boolean} isOwner - 관장 여부 (요청 관리 표시)
 */
export default function FeaturePanel({ onFeatureClick, isOwner = false }) {
    const allFeatures = isOwner ? [...FEATURES, ...OWNER_FEATURES] : FEATURES;

    return (
        <div className="flex flex-col gap-3">
            <h3
                className="text-xs font-bold px-1 mb-1"
                style={{ color: '#7a7a6a', letterSpacing: '1px' }}
            >
                자료실
            </h3>
            {allFeatures.map(({ key, label, icon: Icon, color, bg }) => (
                <button
                    key={key}
                    onClick={() => onFeatureClick(key)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: bg,
                        border: `1.5px solid ${color}20`,
                        boxShadow: `0 2px 8px ${color}10`,
                    }}
                >
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: color, color: '#fff' }}
                    >
                        <Icon size={20} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#3a3a2a' }}>
                        {label}
                    </span>
                </button>
            ))}
        </div>
    );
}
