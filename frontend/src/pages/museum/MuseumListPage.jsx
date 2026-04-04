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

  const filteredMuseums = museums.filter(m => m.type === activeTab);

  const renderEmptyState = () => {
    const emptyConfig = {
      public: {
        icon: '🏺',
        title: '아직 전시된 기록이 없습니다',
        description: '누구나 볼 수 있는 우리 가족의 명예의 전당.',
        hint: '소중한 추억을 세상과 나눠보세요. 첫 번째 박물관이 여기서 시작됩니다.',
      },
      family: {
        icon: '🏠',
        title: '가족만의 공간을 만들어보세요',
        description: '가족끼리만 공유하는 비밀스러운 추억 보관함.',
        hint: '웃음, 눈물, 일상의 소소한 순간까지 — 모두 담을 수 있어요.',
      },
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
          onClick={() => navigate('/family-setup')}
        >
          <span className="plus-icon">+</span> 새 박물관 만들기
        </button>
      </div>
    );
  };

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

  if (error) {
    return (
      <div className="museum-list-container">
        <div className="error-state">
          <p>{error}</p>
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
        <h1>나의 박물관</h1>

        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => setActiveTab('public')}
          >
            공개 박물관
          </button>
          <button
            className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
            onClick={() => setActiveTab('family')}
          >
            가족유산박물관
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
                onClick={() => navigate(`/${museum.subdomain}`)}
              >
                <div className="card-image">
                  {museum.thumbnail_url ? (
                    <img src={museum.thumbnail_url} alt={museum.title} />
                  ) : (
                    <div className="image-placeholder">
                      {activeTab === 'public' ? '🏛️' : '🏠'}
                    </div>
                  )}
                </div>

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
