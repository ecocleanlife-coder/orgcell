import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function FamilyBanner() {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);
    return (
        <div onClick={() => navigate('/family-website')}
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white py-2.5 px-4 text-center cursor-pointer hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 transition-all select-none">
            <p className="text-sm md:text-base font-bold flex items-center justify-center gap-2 flex-wrap">
                <Heart size={16} fill="white" className="animate-pulse" />
                <span>{t.bannerLine1}</span>
                <span className="text-emerald-200">—</span>
                <span>{t.bannerLine2}</span>
            </p>
        </div>
    );
}
