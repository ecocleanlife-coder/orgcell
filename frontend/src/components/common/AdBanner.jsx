import React, { useState, useEffect } from 'react';
import { ExternalLink, Info } from 'lucide-react';

// List of internal promotional banners
const customBanners = [
    {
        id: 'nci-erp',
        title: 'NCI Sage Pro ERP 도입 문의',
        description: '건설 현장의 모든 것을 하나의 솔루션으로 완벽하게 관리하세요.',
        cta: '무료 컨설팅 받기',
        link: 'https://pro.gonciusa.com',
        color: 'from-blue-600 to-blue-800'
    },
    {
        id: 'nci-materials',
        title: '건축 자재 10% 추가 할인',
        description: 'Orgcell 회원 전용 혜택! 최고급 호텔 자재를 공장 직영가로 만나보세요.',
        cta: '할인 상품 보기',
        link: '#',
        color: 'from-amber-600 to-amber-700'
    }
];

export default function AdBanner({ type = 'auto', className = '' }) {
    const [currentPattern, setCurrentPattern] = useState(0);
    const [useAdsense, setUseAdsense] = useState(false); // Change to true when AdSense is configured

    useEffect(() => {
        // Randomly select a custom banner if not using AdSense
        setCurrentPattern(Math.floor(Math.random() * customBanners.length));
    }, []);

    const banner = customBanners[currentPattern];

    if (useAdsense) {
        return (
            <div className={`w-full bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center min-h-[100px] ${className}`}>
                <span className="text-xs text-gray-400 absolute top-2 right-2">Ad</span>
                <p className="text-gray-500">Google AdSense Space</p>
            </div>
        );
    }

    return (
        <a
            href={banner.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${className}`}
        >
            <div className={`bg-gradient-to-r ${banner.color} p-4 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm">Sponsor</span>
                        <h4 className="font-bold text-lg">{banner.title}</h4>
                    </div>
                    <p className="text-white/80 text-sm hidden sm:block">{banner.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-white text-gray-900 px-4 py-2 rounded-xl font-bold text-sm group-hover:bg-gray-50 transition-colors">
                    {banner.cta}
                    <ExternalLink size={16} className="text-gray-500" />
                </div>
            </div>

            {/* Subtle info icon for Ad */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title="NCI Network Advertisement">
                <Info size={14} className="text-white/50" />
            </div>
        </a>
    );
}
