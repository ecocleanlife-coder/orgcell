// src/pages/MuseumListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MuseumListPage.css';

const MuseumListPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('public');
  const [museums, setMuseums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ API 호출: 박물관 목록 조회
  useEffect(() => {
    fetchMuseums();
  }, []);

  const fetchMuseums = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/museum/mine');
      setMuseums(response.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Fetch museums error:', err);
      setError('박물관을 불러올 수 없습니다');
      setMuseums([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 탭별 필터링
  const filteredMuseums = museums.filter(m => m.type === activeTab);

  // ✅ 빈 상태 렌더링
  const renderEmptyState = () => {
    const emptyConfig = {
      public: {
        icon: '🏛️',
        title: '전시된 기록이 아직 없네요',
        description: '누구나 볼 수 있는 우리 가족의 명예의 전당입니다.',
        hint: '첫 번째 박물관을 만들어 소중한 추억을 공유해보세요.'
      },
      family: {
        icon: '🏠',
        title: '가족 박물관이 아직 없네요',
        description: '가족끼리만 공유하는 비밀스러운 공간입니다.',
        hint: '가족의 특별한 순간들을 담아보세요.'
      }
    };

    const config = emptyConfig[activeTab];

    return (
      <div className="empty-museum-state">
        <div className="icon-wrapper">{config.icon}</div>
        <h2>{config.title}</h2>
        <p className="description">{config.description}</p>
        <p className="hint">{config.hint}</p>
        <button
          className="main-create-btn"
          onClick={() => navigate('/create-museum')}
        >
          <span className="plus-icon">+</span> 새 박물관 만들기
        </button>
      </div>
    );
  };

  // ✅ 로딩 상태
  if (loading) {
    return (
      <div className="museum-list-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>박물관을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ✅ 에러 상태
  if (error) {
    return (
      <div className="museum-list-container">
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={fetchMuseums} className="retry-btn">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="museum-list-container">
      <div className="list-header">
        <h1>나의 박물관 기록</h1>

        {/* ✅ 탭 버튼 */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => setActiveTab('public')}
          >
            🏛️ 일반공개관
          </button>
          <button
            className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
            onClick={() => setActiveTab('family')}
          >
            🏠 가족공개관
          </button>
        </div>
      </div>

      <div className="museum-content">
        {filteredMuseums.length > 0 ? (
          <div className="museum-grid">
            {filteredMuseums.map(museum => (
              <div
                key={museum.id}
                className="museum-card"
                onClick={() => navigate(`/museums/${museum.subdomain}`)}
              >
                {/* ✅ 박물관 이미지 */}
                <div className="card-image">
                  {museum.thumbnail_url ? (
                    <img src={museum.thumbnail_url} alt={museum.title} />
                  ) : (
                    <div className="image-placeholder">
                      {activeTab === 'public' ? '🏛️' : '🏠'}
                    </div>
                  )}
                </div>

                {/* ✅ 박물관 정보 */}
                <div className="card-content">
                  <h3 className="card-title">{museum.title}</h3>
                  <p className="card-description">
                    {museum.description || '소중한 추억을 담은 박물관'}
                  </p>

                  <div className="card-meta">
                    <span className="card-type">
                      {museum.type === 'public' ? '공개' : '가족 전용'}
                    </span>
                    <span className="card-date">
                      {new Date(museum.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* ✅ 호버 효과 오버레이 */}
                <div className="card-overlay">
                  <button className="view-btn">둘러보기</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default MuseumListPage;
