/**
 * WebUploadSort — Smart Sort MVP (Web Upload Mode)
 *
 * 흐름: 파일 선택 → 날짜 분석 → 분류 결과 미리보기
 *
 * TODO(AI): 인물/장소 분류는 현재 미연동. 아래 주석 참고:
 *   - 인물: face-api.js 또는 AWS Rekognition 연동 필요
 *   - 장소: EXIF GPS → reverse geocoding API 연동 필요
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FolderOpen, CheckCircle2, Sparkles, AlertCircle, X, ImageIcon } from 'lucide-react';

const THUMB_SIZE = 80;

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getDateGroup(file) {
    // 1. EXIF date from filename (IMG_20231225_xxx, 2024-01-15_xxx, etc.)
    const nameMatch = file.name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    if (nameMatch) {
        const [, y, m] = nameMatch;
        return `${y}년 ${parseInt(m)}월`;
    }
    // 2. file.lastModified fallback
    const d = new Date(file.lastModified);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export default function WebUploadSort() {
    const inputRef = useRef(null);
    const [step, setStep] = useState('idle'); // idle | analyzing | results
    const [files, setFiles] = useState([]);
    const [groups, setGroups] = useState({}); // { "2024년 3월": [{file, thumb}] }
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = useCallback(async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const imageFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            setError('이미지 파일을 선택해 주세요.');
            return;
        }

        setError('');
        setStep('analyzing');
        setProgress(0);

        const grouped = {};
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            let thumb = null;
            try {
                thumb = await readFileAsDataURL(file);
            } catch {
                // skip thumbnail
            }

            const group = getDateGroup(file);
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push({ file, thumb });

            setProgress(Math.round(((i + 1) / imageFiles.length) * 100));
        }

        setFiles(imageFiles);
        setGroups(grouped);
        setStep('results');
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const handleReset = () => {
        setStep('idle');
        setFiles([]);
        setGroups({});
        setProgress(0);
        setError('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        const parseKey = k => {
            const m = k.match(/(\d{4})년\s+(\d+)월/);
            return m ? parseInt(m[1]) * 100 + parseInt(m[2]) : 0;
        };
        return parseKey(b) - parseKey(a);
    });

    /* ── IDLE ── */
    if (step === 'idle') {
        return (
            <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                style={{
                    border: `2px dashed ${isDragging ? '#8a70c0' : '#d8cce8'}`,
                    borderRadius: 20,
                    padding: '48px 32px',
                    textAlign: 'center',
                    background: isDragging ? '#f0eaf8' : '#fdf8f0',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                }}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => processFiles(e.target.files)}
                />
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#4a3a2a', marginBottom: 6 }}>
                    사진을 드래그하거나 클릭해서 선택하세요
                </p>
                <p style={{ fontSize: 13, color: '#8a7a6a' }}>
                    여러 장 동시 선택 가능 · JPG, PNG, HEIC 지원
                </p>

                {error && (
                    <p style={{ marginTop: 12, fontSize: 13, color: '#c0392b' }}>{error}</p>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    style={{
                        marginTop: 24,
                        padding: '12px 32px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #c9a882, #b08060)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Upload size={16} />
                    사진 선택하기
                </button>
            </div>
        );
    }

    /* ── ANALYZING ── */
    if (step === 'analyzing') {
        return (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <Sparkles size={48} style={{ color: '#8a7040', animation: 'spin 2s linear infinite', display: 'inline' }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#4a3a2a', marginBottom: 8 }}>
                    날짜 분석 중…
                </p>
                <p style={{ fontSize: 13, color: '#8a7a6a', marginBottom: 20 }}>
                    {files.length}장 처리 중
                </p>
                <div style={{ maxWidth: 320, margin: '0 auto', height: 8, borderRadius: 99, background: '#e8ddd0', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, #e8b88a, #d4976a)',
                        width: `${progress}%`,
                        transition: 'width 0.2s',
                    }} />
                </div>
                <p style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>{progress}%</p>
            </div>
        );
    }

    /* ── RESULTS ── */
    return (
        <div>
            {/* Summary */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 10,
            }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <StatBadge label="총 사진" value={files.length} color="#6a5a4a" bg="#fdf8f0" />
                    <StatBadge label="날짜 그룹" value={sortedGroupKeys.length} color="#4a7a9a" bg="#eef6ff" />
                    {/* TODO(AI): 인물 그룹 수 표시 — face-api.js 연동 후 활성화 */}
                    <StatBadge label="인물 (AI 준비중)" value="—" color="#888" bg="#f5f5f5" />
                    {/* TODO(AI): 장소 분류 — GPS EXIF + reverse geocoding 연동 후 활성화 */}
                    <StatBadge label="장소 (AI 준비중)" value="—" color="#888" bg="#f5f5f5" />
                </div>
                <button
                    onClick={handleReset}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 10,
                        background: '#f0ece8',
                        border: '1px solid #e0d8d0',
                        color: '#6a5a4a',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    <X size={14} /> 다시 선택
                </button>
            </div>

            {/* TODO AI notice */}
            <div style={{
                background: '#fff8e8',
                border: '1px solid #f0d890',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#8a6a20',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                    현재는 <strong>날짜 기준 분류</strong>만 지원합니다.
                    인물·장소 AI 분류는 준비 중입니다.{' '}
                    {/* TODO(AI): AWS Rekognition 또는 face-api.js 연동 */}
                </span>
            </div>

            {/* Date groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {sortedGroupKeys.map(groupKey => {
                    const items = groups[groupKey];
                    return (
                        <div key={groupKey} style={{
                            background: '#fdf8f0',
                            border: '1px solid #e8ddd0',
                            borderRadius: 16,
                            padding: '16px 18px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 12,
                            }}>
                                <FolderOpen size={18} style={{ color: '#c9a882' }} />
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#4a3a2a' }}>{groupKey}</span>
                                <span style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    background: '#e8d8c0',
                                    color: '#6a5030',
                                }}>{items.length}장</span>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_SIZE}px, 1fr))`,
                                gap: 8,
                            }}>
                                {items.slice(0, 20).map((item, i) => (
                                    <div key={i} style={{
                                        width: THUMB_SIZE,
                                        height: THUMB_SIZE,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        background: '#e8ddd0',
                                        flexShrink: 0,
                                    }}>
                                        {item.thumb ? (
                                            <img
                                                src={item.thumb}
                                                alt={item.file.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ImageIcon size={24} style={{ color: '#aaa' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {items.length > 20 && (
                                    <div style={{
                                        width: THUMB_SIZE,
                                        height: THUMB_SIZE,
                                        borderRadius: 10,
                                        background: '#e8d8c0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#6a5030',
                                    }}>
                                        +{items.length - 20}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Done message */}
            <div style={{
                marginTop: 24,
                padding: '16px 20px',
                background: '#eef8f0',
                border: '1px solid #c8e8c0',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
            }}>
                <CheckCircle2 size={20} style={{ color: '#27ae60', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#27ae60' }}>
                    {files.length}장 분석 완료 · {sortedGroupKeys.length}개 날짜 폴더로 분류되었습니다.
                </span>
            </div>
        </div>
    );
}

function StatBadge({ label, value, color, bg }) {
    return (
        <div style={{
            background: bg,
            border: '1px solid #e8ddd0',
            borderRadius: 12,
            padding: '8px 14px',
            textAlign: 'center',
            minWidth: 80,
        }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        </div>
    );
}
