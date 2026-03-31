import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ── 폴더 카드 (일반 / FamilySearch / 본인 / Ghost) ── */
function FolderCard({ name, year, role, variant = 'normal', isMe, style: extraStyle }) {
    const isFS = variant === 'familysearch';
    const isGhost = variant === 'ghost';

    const bg = isFS ? '#EBF4FB' : isGhost ? 'transparent' : 'linear-gradient(145deg, #F5DEB3, #F5DEB3CC)';
    const border = isMe
        ? '2px solid #3D2008'
        : isFS
            ? '1.5px dashed #7EB8D4'
            : isGhost
                ? '1.5px dashed #D4C5A0'
                : '1px solid rgba(61,32,8,0.08)';
    const tabBg = isFS ? '#D0E8F5' : isGhost ? '#E8E3D8' : '#F5DEB3';

    return (
        <div style={{
            background: bg,
            borderRadius: 12,
            padding: '10px 8px 8px',
            width: 75,
            height: 85,
            textAlign: 'center',
            position: 'relative',
            boxShadow: isGhost ? 'none' : '0 2px 8px rgba(61,32,8,0.06)',
            border,
            cursor: 'pointer',
            flexShrink: 0,
            opacity: isGhost ? 0.5 : 1,
            ...extraStyle,
        }}>
            {/* 폴더 탭 */}
            <div style={{
                position: 'absolute', top: -7, left: 8,
                width: 24, height: 8, borderRadius: '5px 5px 0 0',
                background: tabBg,
                border: isFS ? '1.5px dashed #7EB8D4' : isGhost ? '1px dashed #D4C5A0' : '1px solid rgba(61,32,8,0.08)',
                borderBottom: 'none',
            }} />
            {/* FamilySearch 배지 */}
            {isFS && (
                <span style={{
                    position: 'absolute', top: -4, right: -4,
                    fontSize: 10, background: '#fff', borderRadius: '50%',
                    width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}>🌐</span>
            )}
            <div style={{
                fontSize: 13, fontWeight: 700, marginTop: 4, marginBottom: 2,
                color: isGhost ? '#A09882' : '#3D2008',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {name}
            </div>
            <div style={{ fontSize: 10, color: isGhost ? '#C4B99A' : '#7A6E5E', lineHeight: 1.3 }}>
                {role}{year ? ` · ${year}` : ''}
            </div>
        </div>
    );
}

/* ── 수직 연결선 ── */
function VLine({ dashed, height = 20 }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            <div style={{
                width: 2, height,
                background: dashed ? 'transparent' : '#C4A882',
                borderLeft: dashed ? '2px dashed #7EB8D4' : 'none',
                borderRadius: 1,
            }} />
        </div>
    );
}

/* ── 수평 연결선 (부부) ── */
function HLine({ width = 20, dashed }) {
    return (
        <div style={{
            width, height: 2, alignSelf: 'center',
            background: dashed ? 'transparent' : '#C4A882',
            borderTop: dashed ? '2px dashed #7EB8D4' : 'none',
        }} />
    );
}

/* ── 세대 행 ── */
function GenRow({ children, label, delay = 0 }) {
    return (
        <div style={{
            animation: `fadeSlideUp 0.6s ease ${delay}s both`,
        }}>
            {label && (
                <div style={{
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    color: '#A09882', marginBottom: 6, letterSpacing: 1,
                }}>
                    {label}
                </div>
            )}
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                gap: 6, flexWrap: 'nowrap',
            }}>
                {children}
            </div>
        </div>
    );
}

export default function FamilyTreePreview() {
    const navigate = useNavigate();

    return (
        <div style={{
            background: '#FFFDF7',
            borderRadius: 20,
            padding: '24px 12px 20px',
            border: '1px solid #E8E3D8',
            width: '100%',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(61,32,8,0.06)',
            overflowX: 'auto',
        }}>
            {/* 내부 최소 너비 */}
            <div style={{ minWidth: 580, padding: '0 8px' }}>

                {/* ── FamilySearch 연동 영역 ── */}
                <div style={{
                    border: '1.5px dashed #7EB8D4',
                    borderRadius: 14,
                    padding: '12px 16px 10px',
                    background: '#F4F9FD',
                    marginBottom: 0,
                    animation: 'fadeSlideDown 0.6s ease 0s both',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, marginBottom: 10,
                    }}>
                        <span style={{ fontSize: 13 }}>🌐</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4A8DB7' }}>
                            FamilySearch.org 연동
                        </span>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 6,
                    }}>
                        <FolderCard name="김태조" year="1905" role="증조부" variant="familysearch" />
                        <HLine width={16} dashed />
                        <FolderCard name="박씨" year="1908" role="증조모" variant="familysearch" />
                    </div>
                    <div style={{
                        textAlign: 'center', fontSize: 10, color: '#7EB8D4',
                        marginTop: 8, fontStyle: 'italic',
                    }}>
                        FamilySearch에서 가져온 조상 기록
                    </div>
                </div>

                {/* 점선 연결 */}
                <VLine dashed height={18} />

                {/* ── 0세대: 조부모 ── */}
                <GenRow label="0세대" delay={0.15}>
                    <FolderCard name="김영수" year="1938" role="할아버지" />
                    <HLine width={16} />
                    <FolderCard name="박순자" year="1940" role="할머니" />
                </GenRow>

                <VLine height={16} />

                {/* ── 1세대: 부모 + 형제 ── */}
                <GenRow label="1세대" delay={0.3}>
                    <FolderCard name="김영호" year="1960" role="큰아버지" style={{ opacity: 0.7 }} />
                    <HLine width={8} />
                    <FolderCard name="김철수" year="1965" role="아버지" />
                    <HLine width={10} />
                    <FolderCard name="이영희" year="1968" role="어머니" />
                    <HLine width={8} />
                    <FolderCard name="김영숙" year="1970" role="고모" style={{ opacity: 0.7 }} />
                    <FolderCard name="" year="" role="+ 더보기" variant="ghost" />
                </GenRow>

                <VLine height={16} />

                {/* ── 2세대: 나 + 형제/사촌 ── */}
                <GenRow label="2세대" delay={0.45}>
                    <FolderCard name="김민수" year="1990" role="삼촌" style={{ opacity: 0.7 }} />
                    <HLine width={8} />
                    <FolderCard name="김지훈" year="1992" role="나(본인)" isMe />
                    <HLine width={8} />
                    <FolderCard name="김수진" year="1995" role="여동생" />
                    <HLine width={8} />
                    <FolderCard name="이서연" year="1993" role="이모" style={{ opacity: 0.7 }} />
                    <FolderCard name="" year="" role="+ 더보기" variant="ghost" />
                </GenRow>

                <VLine height={16} />

                {/* ── 3세대: 자녀 ── */}
                <GenRow label="3세대" delay={0.6}>
                    <FolderCard name="김하늘" year="2020" role="아들" />
                    <HLine width={8} />
                    <FolderCard name="김하린" year="2022" role="딸" />
                    <HLine width={8} />
                    <FolderCard name="김민준" year="2021" role="조카" style={{ opacity: 0.7 }} />
                    <FolderCard name="" year="" role="+ 자녀 추가" variant="ghost" />
                </GenRow>
            </div>

            {/* ── FamilySearch 설명 문구 ── */}
            <div style={{
                marginTop: 24, textAlign: 'center', padding: '0 12px',
            }}>
                <p style={{ fontSize: 13, color: '#5A5A4A', lineHeight: 1.7, marginBottom: 12 }}>
                    🌐 FamilySearch.org와 연동하면<br />
                    수백 년 전 조상 기록까지 자동으로 연결됩니다.<br />
                    <span style={{ fontSize: 11, color: '#999' }}>전 세계 10억 건 이상의 족보 데이터베이스</span>
                </p>
                <button
                    onClick={() => navigate('/onboarding/start')}
                    style={{
                        background: 'transparent',
                        border: '1.5px solid #4A8DB7',
                        borderRadius: 10, padding: '7px 18px',
                        fontSize: 12, fontWeight: 600,
                        color: '#4A8DB7', cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    FamilySearch 연동하기
                </button>
            </div>

            {/* 애니메이션 */}
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
