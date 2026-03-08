import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DriveImage({ fileId, alt, className, fallbackSrc }) {
    const [src, setSrc] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let objectUrl = null;
        let isMounted = true;

        if (!fileId) {
            setLoading(false);
            setError(true);
            return;
        }

        const fetchImage = async () => {
            try {
                const res = await axios.get(`/api/drive/download/${fileId}`, {
                    responseType: 'blob'
                });

                if (isMounted) {
                    objectUrl = URL.createObjectURL(res.data);
                    setSrc(objectUrl);
                }
            } catch (err) {
                console.error(`Failed to load drive image ${fileId}`, err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileId]);

    if (loading) {
        return (
            <div className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
                <span className="text-gray-400 text-xs text-center px-2 pt-2">Loading...</span>
            </div>
        );
    }

    if (error || !src) {
        if (fallbackSrc) {
            return <img src={fallbackSrc} alt={alt} className={className} loading="lazy" />;
        }
        return (
            <div className={`bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 ${className}`}>
                <span className="text-gray-400 text-xs">No Image</span>
            </div>
        );
    }

    return <img src={src} alt={alt} className={className} loading="lazy" />;
}
