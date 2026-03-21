import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Send, MessageSquare } from 'lucide-react';

export default function PostDetailModal({ postId, onClose, canComment, t }) {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPost = async () => {
        try {
            const { data } = await axios.get(`/api/board/posts/${postId}`);
            if (data.success) setPost(data.data);
        } catch (err) {
            console.error('fetchPost error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPost(); }, [postId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setSubmitting(true);
        try {
            await axios.post(`/api/board/posts/${postId}/comments`, { content: comment });
            setComment('');
            fetchPost();
        } catch (err) {
            console.error('addComment error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
                style={{ border: '1.5px solid #e8e0d0' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#f0ece4' }}>
                    <h3 className="text-[16px] font-bold" style={{ color: '#3a3a2a' }}>
                        {loading ? (t?.loading || 'Loading...') : post?.title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-6 h-6 border-2 border-[#5a8a4a] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : post ? (
                        <>
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: '#e8e0d0', color: '#5a5040' }}>
                                        {(post.author_name || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: '#3a3a2a' }}>{post.author_name}</p>
                                        <p className="text-xs" style={{ color: '#9a9a8a' }}>{formatDate(post.created_at)}</p>
                                    </div>
                                </div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#4a4a3a' }}>
                                    {post.content}
                                </div>
                            </div>

                            {/* Comments */}
                            <div style={{ borderTop: '1px solid #f0ece4', paddingTop: 16 }}>
                                <div className="flex items-center gap-1.5 mb-3">
                                    <MessageSquare size={14} style={{ color: '#9a9a8a' }} />
                                    <span className="text-xs font-bold" style={{ color: '#9a9a8a' }}>
                                        {t?.boardComments || 'Comments'} ({post.comments?.length || 0})
                                    </span>
                                </div>

                                {post.comments?.length > 0 && (
                                    <div className="space-y-3 mb-4">
                                        {post.comments.map(c => (
                                            <div key={c.id} className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                                    style={{ background: '#f0ece4', color: '#7a7a6a' }}>
                                                    {(c.author_name || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xs font-semibold" style={{ color: '#3a3a2a' }}>{c.author_name}</span>
                                                        <span className="text-[10px]" style={{ color: '#b0b0a0' }}>{formatDate(c.created_at)}</span>
                                                    </div>
                                                    <p className="text-xs mt-0.5" style={{ color: '#5a5a4a' }}>{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-sm" style={{ color: '#9a9a8a' }}>{t?.postNotFound || 'Post not found'}</p>
                    )}
                </div>

                {/* Comment input */}
                {canComment && post && (
                    <form onSubmit={handleAddComment} className="p-4 border-t flex gap-2" style={{ borderColor: '#f0ece4' }}>
                        <input
                            type="text"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder={t?.commentPlaceholder || 'Write a comment...'}
                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                        />
                        <button
                            type="submit"
                            disabled={!comment.trim() || submitting}
                            className="px-3 py-2 rounded-xl text-white font-semibold disabled:opacity-50 transition shrink-0"
                            style={{ background: '#5a8a4a' }}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
