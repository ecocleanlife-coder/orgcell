import React, { useState } from 'react';
import { Folder, FolderOpen, User, Image as ImageIcon, ChevronRight, ChevronDown, Play, Trash2, Camera, Lock, Eye, Globe } from 'lucide-react';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

// Mock photos for a selected person
const mockPhotos = [
    { id: 1, url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=500&q=80', isCover: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&q=80', isCover: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1506869640319-fea1a278e0ec?w=500&q=80', isCover: false },
    { id: 4, url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=500&q=80', isCover: false },
];

export default function FamilyTreeView() {
    const lang = useUiStore((s) => s.lang);
    const lt = getT('familyTree', lang);

    const mockTree = {
        id: 'root',
        name: 'Smith Family Museum',
        type: 'folder',
        children: [
            {
                id: 'grandparents',
                name: lt.grandparents,
                type: 'folder',
                isShared: true,
                children: [
                    { id: 'gp1', name: 'Grandpa John', type: 'person', photoCount: 120 },
                    { id: 'gp2', name: 'Grandma Mary', type: 'person', photoCount: 154 }
                ]
            },
            {
                id: 'parents',
                name: lt.parents,
                type: 'folder',
                isShared: true,
                children: [
                    { id: 'p1', name: 'Dad (Robert)', type: 'person', photoCount: 432 },
                    { id: 'p2', name: 'Mom (Sarah)', type: 'person', photoCount: 512 }
                ]
            },
            {
                id: 'me_and_siblings',
                name: lt.me,
                type: 'folder',
                isShared: true,
                children: [
                    { id: 'me', name: 'Me', type: 'person', photoCount: 843, isPrivate: true },
                    { id: 's1', name: 'Sister (Emily)', type: 'person', photoCount: 321 },
                    { id: 's2', name: 'Brother (Tom)', type: 'person', photoCount: 210 }
                ]
            },
            {
                id: 'children',
                name: lt.children,
                type: 'folder',
                isShared: true,
                children: [
                    { id: 'c1', name: 'Son (Leo)', type: 'person', photoCount: 1054 },
                    { id: 'c2', name: 'Daughter (Mia)', type: 'person', photoCount: 980 }
                ]
            }
        ]
    };

    const [expandedFolders, setExpandedFolders] = useState({ root: true, parents: true, me_and_siblings: true });
    const [selectedNode, setSelectedNode] = useState('me');
    const [isPlaying, setIsPlaying] = useState(false);

    const toggleFolder = (id) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTree = (node, depth = 0) => {
        const isExpanded = expandedFolders[node.id];
        const isSelected = selectedNode === node.id;

        if (node.type === 'folder') {
            return (
                <div key={node.id} className="select-none">
                    <div
                        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
                        onClick={() => { toggleFolder(node.id); setSelectedNode(node.id); }}
                    >
                        {isExpanded ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
                        {isExpanded ? <FolderOpen size={18} className="text-blue-500 shrink-0" fill="currentColor" fillOpacity={0.2} /> : <Folder size={18} className="text-blue-500 shrink-0" fill="currentColor" fillOpacity={0.2} />}
                        <span className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{node.name}</span>
                        {node.isShared && <Eye size={14} className="ml-auto text-emerald-500" title="공유 폴더" />}
                    </div>
                    {isExpanded && node.children && (
                        <div className="mt-1">
                            {node.children.map(child => renderTree(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // Person node
        return (
            <div
                key={node.id}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
                onClick={() => setSelectedNode(node.id)}
            >
                <User size={18} className={`${isSelected ? 'text-blue-600' : 'text-gray-400'} shrink-0`} />
                <span className={`truncate ${isSelected ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{node.name}</span>
                <span className="ml-auto text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{node.photoCount}</span>
                {node.isPrivate && <Lock size={12} className="text-gray-400 ml-1" title="비공개" />}
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-[600px]">
            {/* Left: Tree Navigation */}
            <div className="w-full md:w-1/3 flex flex-col border-r border-gray-100 dark:border-gray-700 pr-4">
                <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Globe className="text-emerald-500" />
                        가계도 마스터
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">세대별, 인물별 폴더 관리</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {renderTree(mockTree)}
                </div>
            </div>

            {/* Right: Museum Viewer */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 relative">

                {/* Viewer Header */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                            <User className="text-blue-500" />
                            {selectedNode === 'me' ? 'Me' : 'Selected Album'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">총 {mockPhotos.length}장의 사진 · 개별 비밀번호 보호됨</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isPlaying ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900'}`}
                        >
                            <Play size={16} className={isPlaying ? 'animate-pulse' : ''} />
                            {isPlaying ? '슬라이드 정지' : '슬라이드쇼 재생'}
                        </button>
                    </div>
                </div>

                {/* Museum Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {mockPhotos.map((photo) => (
                            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                                <img src={photo.url} alt="Museum memory" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                    <div className="flex justify-end gap-2">
                                        <button className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full text-white transition-colors" title="대표사진 설정">
                                            <Camera size={14} />
                                        </button>
                                        <button className="p-1.5 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-full text-white transition-colors" title="삭제">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {photo.isCover && (
                                        <div className="text-xs font-bold text-white bg-blue-500/80 backdrop-blur-sm self-start px-2 py-1 rounded-lg flex items-center gap-1">
                                            <ImageIcon size={12} /> 대표사진
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isPlaying && (
                        <div className="absolute inset-x-0 bottom-4 mx-4 bg-gray-900/90 text-white p-4 rounded-2xl flex items-center justify-center gap-4 animate-fade-in-up border border-gray-700 backdrop-blur-md shadow-2xl">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="font-medium text-sm">디지털 뮤지엄 자동 재생 중... (작품 및 동영상 재생 모드)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
