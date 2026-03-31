import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FamilySearchModal from '../common/FamilySearchModal';

/* ══════════════════════════════════════
   Primitives
   ══════════════════════════════════════ */

function FolderCard({ name, year, role, variant = 'normal', isMe, style: extra }) {
    const isFS = variant === 'familysearch';
    const isGhost = variant === 'ghost';
    const bg = isFS ? '#EBF4FB' : isGhost ? 'transparent' : 'linear-gradient(145deg, #F5DEB3, #F5DEB3CC)';
    const border = isMe ? '2px solid #3D2008'
        : isFS ? '1.5px dashed #7EB8D4'
        : isGhost ? '1.5px dashed #D4C5A0'
        : '1px solid rgba(61,32,8,0.08)';
    const tabBg = isFS ? '#D0E8F5' : isGhost ? '#E8E3D8' : '#F5DEB3';

    return (
        <div style={{
            background: bg, borderRadius: 12, padding: '10px 6px 7px',
            width: 75, height: 85, textAlign: 'center', position: 'relative',
            boxShadow: isGhost ? 'none' : '0 2px 8px rgba(61,32,8,0.06)',
            border, cursor: 'pointer', flexShrink: 0,
            opacity: isGhost ? 0.5 : 1, ...extra,
        }}>
            <div style={{
                position: 'absolute', top: -7, left: 8,
                width: 24, height: 8, borderRadius: '5px 5px 0 0',
                background: tabBg,
                border: isFS ? '1.5px dashed #7EB8D4' : isGhost ? '1px dashed #D4C5A0' : '1px solid rgba(61,32,8,0.08)',
                borderBottom: 'none',
            }} />
            {isFS && (
                <span style={{
                    position: 'absolute', top: -4, right: -4, fontSize: 10,
                    background: '#fff', borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}>🌐</span>
            )}
            <div style={{
                fontSize: 13, fontWeight: 700, marginTop: 4, marginBottom: 2,
                color: isGhost ? '#A09882' : '#3D2008',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</div>
            <div style={{ fontSize: 10, color: isGhost ? '#C4B99A' : '#7A6E5E', lineHeight: 1.3 }}>
                {role}{year ? ` · ${year}` : ''}
            </div>
        </div>
    );
}

/* 부부 박스: 두 카드 + 가로 실선 */
function CoupleBox({ left, right, dashed }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            {left}
            <div style={{
                width: 14, height: 2, alignSelf: 'center',
                background: dashed ? 'transparent' : '#C4A882',
                borderTop: dashed ? '2px dashed #7EB8D4' : 'none',
            }} />
            {right}
        </div>
    );
}

/* 수직 연결선 */
function VLine({ dashed, height = 18 }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 0' }}>
            <div style={{
                width: 0, height, borderLeft: dashed ? '2px dashed #7EB8D4' : '2px solid #C4A882',
            }} />
        </div>
    );
}

/* 부모→자녀 브랜치: 수직 + 수평 분기 + 수직 */
function ChildBranch({ count, width = 200 }) {
    if (count <= 1) return <VLine height={14} />;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 0, height: 10, borderLeft: '2px solid #C4A882' }} />
            <div style={{ width, height: 0, borderTop: '2px solid #C4A882' }} />
            <div style={{
                display: 'flex', justifyContent: 'space-between', width,
            }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} style={{ width: 0, height: 10, borderLeft: '2px solid #C4A882' }} />
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════
   Main Component
   ══════════════════════════════════════ */

export default function FamilyTreePreview() {
    const navigate = useNavigate();
    const [showFsModal, setShowFsModal] = useState(false);

    return (
        <>
        <div style={{
            background: '#FFFDF7', borderRadius: 20, padding: '24px 12px 20px',
            border: '1px solid #E8E3D8', width: '100%', maxWidth: '100%', margin: '0 auto',
            boxShadow: '0 8px 32px rgba(61,32,8,0.06)', overflowX: 'auto',
        }}>
            <div style={{ minWidth: 600, padding: '0 8px' }}>

                {/* ─── FamilySearch 증조부모 ─── */}
                <div style={{
                    border: '1.5px dashed #7EB8D4', borderRadius: 14,
                    padding: '12px 16px 10px', background: '#F4F9FD',
                    animation: 'ftpFadeDown 0.6s ease 0s both',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 13 }}>🌐</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4A8DB7' }}>FamilySearch.org 연동</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <CoupleBox
                            dashed
                            left={<FolderCard name="김태조" year="1905" role="증조부" variant="familysearch" />}
                            right={<FolderCard name="박씨" year="1908" role="증조모" variant="familysearch" />}
                        />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 10, color: '#7EB8D4', marginTop: 8, fontStyle: 'italic' }}>
                        FamilySearch에서 가져온 조상 기록
                    </div>
                </div>

                <VLine dashed height={16} />

                {/* ─── 0세대: 친조부모 (左) + 외조부모 (右) ─── */}
                <div style={{ animation: 'ftpFadeUp 0.6s ease 0.15s both' }}>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#A09882', marginBottom: 6, letterSpacing: 1 }}>
                        0세대 — 조부모
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32 }}>
                        {/* 친가 */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: '#A09882', marginBottom: 4, fontWeight: 600 }}>친가</div>
                            <CoupleBox
                                left={<FolderCard name="김태호" year="1935" role="친할아버지" />}
                                right={<FolderCard name="최순례" year="1937" role="친할머니" />}
                            />
                        </div>
                        {/* 외가 */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: '#A09882', marginBottom: 4, fontWeight: 600 }}>외가</div>
                            <CoupleBox
                                left={<FolderCard name="이정호" year="1938" role="외할아버지" />}
                                right={<FolderCard name="박순자" year="1940" role="외할머니" />}
                            />
                        </div>
                    </div>
                </div>

                {/* 0세대 → 1세대 분기선 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 32, animation: 'ftpFadeUp 0.5s ease 0.2s both' }}>
                    {/* 친가 자녀 분기 */}
                    <div style={{ width: 164 }}><ChildBranch count={3} width={150} /></div>
                    {/* 외가 자녀 분기 */}
                    <div style={{ width: 164 }}><ChildBranch count={2} width={80} /></div>
                </div>

                {/* ─── 1세대: 부모 + 삼촌/고모/이모 ─── */}
                <div style={{ animation: 'ftpFadeUp 0.6s ease 0.3s both' }}>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#A09882', marginBottom: 6, letterSpacing: 1 }}>
                        1세대 — 부모
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                        {/* 큰아버지 (친가 자녀) */}
                        <FolderCard name="김영호" year="1960" role="큰아버지" style={{ opacity: 0.65 }} />
                        {/* 아버지-어머니 부부 (중앙 강조) */}
                        <CoupleBox
                            left={<FolderCard name="김철수" year="1965" role="아버지" />}
                            right={<FolderCard name="이영희" year="1968" role="어머니" />}
                        />
                        {/* 고모 (친가 자녀) */}
                        <FolderCard name="김영숙" year="1970" role="고모" style={{ opacity: 0.65 }} />
                        {/* 이모 (외가 자녀) */}
                        <FolderCard name="이서연" year="1972" role="이모" style={{ opacity: 0.65 }} />
                        <FolderCard name="" year="" role="+ 더보기" variant="ghost" />
                    </div>
                </div>

                {/* 1세대 → 2세대: 아버지-어머니 부부 중앙에서 자녀 분기 */}
                <ChildBranch count={3} width={170} />

                {/* ─── 2세대: 나(본인) + 형제/사촌 ─── */}
                <div style={{ animation: 'ftpFadeUp 0.6s ease 0.45s both' }}>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#A09882', marginBottom: 6, letterSpacing: 1 }}>
                        2세대 — 본인
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                        {/* 사촌 (큰아버지 자녀) */}
                        <FolderCard name="김민수" year="1990" role="사촌" style={{ opacity: 0.6 }} />
                        {/* 나(본인) — 배우자 부부 */}
                        <CoupleBox
                            left={<FolderCard name="김지훈" year="1992" role="나(본인)" isMe />}
                            right={<FolderCard name="신세라" year="1994" role="아내" />}
                        />
                        {/* 여동생 — 배우자 */}
                        <CoupleBox
                            left={<FolderCard name="김수진" year="1995" role="여동생" />}
                            right={<FolderCard name="J.Lambert" year="1993" role="매형" style={{ fontSize: 11 }} />}
                        />
                        <FolderCard name="" year="" role="+ 더보기" variant="ghost" />
                    </div>
                </div>

                {/* 2세대 → 3세대: 두 부부에서 각각 자녀 분기 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
                    <div style={{ width: 100 }}><ChildBranch count={2} width={85} /></div>
                    <div style={{ width: 80 }}><ChildBranch count={1} width={0} /></div>
                </div>

                {/* ─── 3세대: 자녀 ─── */}
                <div style={{ animation: 'ftpFadeUp 0.6s ease 0.6s both' }}>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#A09882', marginBottom: 6, letterSpacing: 1 }}>
                        3세대 — 자녀
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                        <FolderCard name="김하늘" year="2020" role="아들" />
                        <FolderCard name="김하린" year="2022" role="딸" />
                        <div style={{ width: 20 }} />
                        <FolderCard name="김민준" year="2021" role="조카" style={{ opacity: 0.7 }} />
                        <FolderCard name="" year="" role="+ 자녀 추가" variant="ghost" />
                    </div>
                </div>
            </div>

            {/* ─── FamilySearch 설명 ─── */}
            <div style={{ marginTop: 24, textAlign: 'center', padding: '0 12px' }}>
                <p style={{ fontSize: 13, color: '#5A5A4A', lineHeight: 1.7, marginBottom: 12 }}>
                    🌐 FamilySearch.org와 연동하면<br />
                    수백 년 전 조상 기록까지 자동으로 연결됩니다.<br />
                    <span style={{ fontSize: 11, color: '#999' }}>전 세계 10억 건 이상의 족보 데이터베이스</span>
                </p>
                <button
                    onClick={() => setShowFsModal(true)}
                    style={{
                        background: 'transparent', border: '1.5px solid #4A8DB7',
                        borderRadius: 10, padding: '7px 18px', fontSize: 12,
                        fontWeight: 600, color: '#4A8DB7', cursor: 'pointer',
                    }}
                >
                    FamilySearch 연동하기
                </button>
            </div>

            <style>{`
                @keyframes ftpFadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ftpFadeDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
        {showFsModal && <FamilySearchModal onClose={() => setShowFsModal(false)} />}
        </>
    );
}
