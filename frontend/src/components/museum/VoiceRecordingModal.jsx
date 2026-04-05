import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Square, Play, Pause, Trash2, Save, User } from 'lucide-react';
import axios from 'axios';

export default function VoiceRecordingModal({ siteId, persons = [], onClose, inline = false }) {
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Form state
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Saved recordings list
    const [recordings, setRecordings] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [playingId, setPlayingId] = useState(null);

    // Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(new Audio());
    const playbackAudioRef = useRef(new Audio());

    // Fetch existing recordings
    const fetchRecordings = useCallback(async () => {
        if (!siteId) return;
        setLoadingList(true);
        try {
            const res = await axios.get('/api/voice/recordings', { params: { site_id: siteId } });
            if (res.data?.success) setRecordings(res.data.data);
        } catch { /* silent */ }
        finally { setLoadingList(false); }
    }, [siteId]);

    useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            audioRef.current.pause();
            playbackAudioRef.current.pause();
        };
    }, [audioUrl]);

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start(100); // collect data every 100ms
            setIsRecording(true);
            setDuration(0);
            setAudioBlob(null);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);

            // Timer
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 200);
        } catch (err) {
            console.error('Microphone access denied:', err);
            alert('마이크 접근이 거부되었습니다. 브라우저 설정을 확인해주세요.');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    // Play preview
    const togglePreview = () => {
        if (!audioUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.src = audioUrl;
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    // Reset recording
    const resetRecording = () => {
        stopRecording();
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setDuration(0);
        setIsPlaying(false);
        audioRef.current.pause();
    };

    // Save recording
    const handleSave = async () => {
        if (!audioBlob || !siteId) return;
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('audio', audioBlob, 'recording.webm');
            fd.append('site_id', siteId);
            if (selectedPersonId) fd.append('person_id', selectedPersonId);
            fd.append('duration', duration);
            fd.append('description', description);

            await axios.post('/api/voice/upload', fd);
            resetRecording();
            setDescription('');
            setSelectedPersonId('');
            fetchRecordings();
        } catch (err) {
            console.error('Save recording error:', err);
            alert('녹음 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // Delete recording
    const handleDelete = async (id) => {
        if (!confirm('이 녹음을 삭제하시겠습니까?')) return;
        try {
            await axios.delete(`/api/voice/recordings/${id}`);
            fetchRecordings();
        } catch (err) {
            console.error('Delete recording error:', err);
        }
    };

    // Play saved recording
    const playSaved = (recording) => {
        if (playingId === recording.id) {
            playbackAudioRef.current.pause();
            setPlayingId(null);
        } else {
            playbackAudioRef.current.src = recording.file_path;
            playbackAudioRef.current.onended = () => setPlayingId(null);
            playbackAudioRef.current.play();
            setPlayingId(recording.id);
        }
    };

    // Format duration MM:SS
    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const containerClass = inline ? "flex flex-col h-full bg-white rounded-2xl w-full border border-[#e8e0d0]" : "fixed inset-0 z-50 flex flex-col";

    return (
        <div
            className={containerClass}
            style={{ background: '#FAFAF7' }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: '#e8e0d0', background: 'rgba(250,250,247,0.98)' }}
            >
                <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>
                    🎙️ 육성녹음
                </h2>
                {!inline && (
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: '#f0ece4' }}
                >
                    <X size={16} style={{ color: '#7a7a6a' }} />
                </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-lg mx-auto space-y-6">

                    {/* Recording controls */}
                    <div
                        className="rounded-2xl p-6 text-center"
                        style={{ background: '#fff', border: '1.5px solid #e8e0d0' }}
                    >
                        {/* Duration display */}
                        <div
                            className="text-4xl font-mono font-bold mb-6"
                            style={{ color: isRecording ? '#e74c3c' : '#3a3a2a' }}
                        >
                            {formatDuration(duration)}
                        </div>

                        {/* Recording indicator */}
                        {isRecording && (
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div
                                    className="w-3 h-3 rounded-full animate-pulse"
                                    style={{ background: '#e74c3c' }}
                                />
                                <span className="text-sm font-bold" style={{ color: '#e74c3c' }}>
                                    녹음 중...
                                </span>
                            </div>
                        )}

                        {/* Control buttons */}
                        <div className="flex items-center justify-center gap-4">
                            {!isRecording && !audioBlob && (
                                <button
                                    onClick={startRecording}
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
                                    style={{ background: '#e74c3c', boxShadow: '0 4px 12px rgba(231,76,60,0.3)' }}
                                >
                                    <Mic size={28} />
                                </button>
                            )}

                            {isRecording && (
                                <button
                                    onClick={stopRecording}
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
                                    style={{ background: '#3a3a2a', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                >
                                    <Square size={24} />
                                </button>
                            )}

                            {audioBlob && (
                                <>
                                    <button
                                        onClick={togglePreview}
                                        className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                        style={{
                                            background: isPlaying ? '#C4A84F' : '#e8f5e0',
                                            color: isPlaying ? '#fff' : '#3a7a2a',
                                        }}
                                    >
                                        {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                                    </button>
                                    <button
                                        onClick={resetRecording}
                                        className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                        style={{ background: '#fee', color: '#e74c3c' }}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Save form (shown after recording) */}
                    {audioBlob && (
                        <div
                            className="rounded-2xl p-5 space-y-4"
                            style={{ background: '#fff', border: '1.5px solid #e8e0d0' }}
                        >
                            {/* Person selector */}
                            <div>
                                <label className="text-xs font-bold block mb-1.5" style={{ color: '#7a7a6a' }}>
                                    <User size={12} className="inline mr-1" />
                                    누구의 목소리인가요?
                                </label>
                                <select
                                    value={selectedPersonId}
                                    onChange={(e) => setSelectedPersonId(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a', background: '#FAFAF7' }}
                                >
                                    <option value="">선택 안 함</option>
                                    {persons.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold block mb-1.5" style={{ color: '#7a7a6a' }}>
                                    설명 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="예: 할아버지의 이야기"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                />
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                                style={{ background: '#C4A84F' }}
                            >
                                {saving ? '저장 중...' : '💾 녹음 저장'}
                            </button>
                        </div>
                    )}

                    {/* Saved recordings list */}
                    <div>
                        <h3 className="text-sm font-bold mb-3" style={{ color: '#3a3a2a' }}>
                            저장된 녹음 ({recordings.length})
                        </h3>

                        {loadingList ? (
                            <div className="text-center py-8" style={{ color: '#9a9a8a' }}>
                                불러오는 중...
                            </div>
                        ) : recordings.length === 0 ? (
                            <div className="text-center py-8" style={{ color: '#9a9a8a' }}>
                                <span className="text-3xl block mb-2">🎙️</span>
                                <p className="text-sm">아직 녹음이 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recordings.map(rec => (
                                    <div
                                        key={rec.id}
                                        className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: '#fff', border: '1px solid #e8e0d0' }}
                                    >
                                        <button
                                            onClick={() => playSaved(rec)}
                                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
                                            style={{
                                                background: playingId === rec.id ? '#C4A84F' : '#f0ece4',
                                                color: playingId === rec.id ? '#fff' : '#3a3a2a',
                                            }}
                                        >
                                            {playingId === rec.id ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: '#3a3a2a' }}>
                                                {rec.person_name || '미지정'} {rec.description && `— ${rec.description}`}
                                            </p>
                                            <p className="text-xs" style={{ color: '#9a9a8a' }}>
                                                {formatDuration(rec.duration)} · {new Date(rec.created_at).toLocaleDateString('ko-KR')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(rec.id)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                            style={{ color: '#e74c3c' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}