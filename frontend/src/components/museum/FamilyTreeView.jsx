import React, { useState } from 'react';
import { Folder, FolderLock, Plus, Image as ImageIcon, Play, MoreVertical, ChevronLeft } from 'lucide-react';

const initialTree = [
    {
        id: 1, name: 'Grandparents', nameKo: '조부모님', count: 128, isShared: true,
        children: [
            {
                id: 2, name: 'Parents', nameKo: '부모님', count: 342, isShared: true,
                children: [
                    {
                        id: 3, name: 'Me', nameKo: '나', count: 520, isPrivate: true,
                        children: [
                            { id: 7, name: 'My Children', nameKo: '나의 자녀들', count: 215, children: [
                                { id: 10, name: 'Grandchildren', nameKo: '손주들', count: 48, children: [] },
                            ]},
                        ],
                    },
                    {
                        id: 4, name: 'Brother', nameKo: '형', count: 85,
                        children: [
                            { id: 8, name: "Brother's Children", nameKo: '형의 자녀들', count: 67, children: [] },
                        ],
                    },
                    {
                        id: 5, name: 'Sister', nameKo: '여동생', count: 110,
                        children: [
                            { id: 9, name: "Sister's Children", nameKo: '여동생의 자녀들', count: 42, children: [] },
                        ],
                    },
                ],
            },
        ],
    },
];

function TreeNode({ node, level = 0, onSelect, selectedId }) {
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="flex flex-col items-center">
            {/* Node Card */}
            <button
                onClick={() => onSelect(node)}
                className={`relative px-4 py-3 rounded-2xl border-2 transition-all text-center min-w-[120px] max-w-[160px]
                    ${isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-lg shadow-emerald-500/20 scale-105'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 hover:shadow-md'
                    }
                `}
            >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                    {node.isPrivate
                        ? <FolderLock size={14} className="text-amber-500" />
                        : <Folder size={14} className="text-emerald-500" />
                    }
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{node.nameKo}</span>
                </div>
                <span className="text-[10px] text-gray-400">{node.count}장</span>
                {node.isShared && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">S</span>
                    </span>
                )}
            </button>

            {/* Children */}
            {hasChildren && (
                <>
                    {/* Vertical connector */}
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

                    {/* Horizontal bar + children */}
                    <div className="relative flex items-start">
                        {node.children.length > 1 && (
                            <div
                                className="absolute top-0 bg-gray-300 dark:bg-gray-600"
                                style={{
                                    height: '1px',
                                    left: '50%',
                                    right: '50%',
                                    marginLeft: `-${(node.children.length - 1) * 80}px`,
                                    marginRight: `-${(node.children.length - 1) * 80}px`,
                                    width: `${(node.children.length - 1) * 160}px`,
                                    transform: 'translateX(-50%)',
                                }}
                            ></div>
                        )}
                        <div className="flex gap-4 md:gap-8">
                            {node.children.map((child) => (
                                <div key={child.id} className="flex flex-col items-center">
                                    {/* Vertical connector from horizontal bar */}
                                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                                    <TreeNode
                                        node={child}
                                        level={level + 1}
                                        onSelect={onSelect}
                                        selectedId={selectedId}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function FamilyTreeView() {
    const [selectedFolder, setSelectedFolder] = useState(null);
    const mockPhotos = [...Array(12)].map((_, i) => ({ id: i }));

    // Gallery view when a folder is selected
    if (selectedFolder) {
        return (
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[600px] w-full max-w-5xl mx-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedFolder(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {selectedFolder.isPrivate && <FolderLock size={16} className="text-amber-500" />}
                                {selectedFolder.nameKo}
                                <span className="text-sm font-normal text-gray-500">{selectedFolder.count}장</span>
                            </h2>
                            <p className="text-xs text-gray-400">{selectedFolder.name}</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                        <Play size={14} fill="currentColor" />
                        Slideshow
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {mockPhotos.map((photo) => (
                            <div key={photo.id} className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl group overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <ImageIcon size={32} className="opacity-50" />
                                </div>
                                <div className="absolute inset-x-0 top-0 p-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/50 to-transparent">
                                    <button className="text-white hover:text-gray-200"><MoreVertical size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Family Tree view
    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden w-full max-w-5xl mx-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Family Tree</h3>
                <button className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                    <Plus size={16} /> Add Member
                </button>
            </div>

            <div className="p-8 overflow-x-auto">
                <div className="flex justify-center min-w-[600px]">
                    {initialTree.map((root) => (
                        <TreeNode
                            key={root.id}
                            node={root}
                            onSelect={setSelectedFolder}
                            selectedId={selectedFolder?.id}
                        />
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-400">
                    Click a folder to view photos. <span className="inline-flex items-center gap-1"><FolderLock size={10} className="text-amber-500" /> Private</span> / <span className="inline-flex items-center gap-1"><Folder size={10} className="text-emerald-500" /> Shared</span>
                </p>
            </div>
        </section>
    );
}
