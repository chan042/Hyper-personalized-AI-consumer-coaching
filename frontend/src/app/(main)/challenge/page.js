"use client";

/**
 * [파일 역할]
 * - 챌린지 페이지 메인 컴포넌트
 * - 백엔드 API 연동으로 실제 데이터 표시
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

// 컴포넌트
import ChallengeTabs from '@/components/challenge/ChallengeTabs';
import ChallengeFilters from '@/components/challenge/ChallengeFilters';
import ChallengeCard from '@/components/challenge/ChallengeCard';
import ChallengeDetailModal from '@/components/challenge/ChallengeDetailModal';

// API
import {
    getChallenges,
    getMyChallenges,
    getAIChallenges,
    startChallenge,
    startAIChallenge,
    cancelChallenge,
    getUserPoints,
} from '@/lib/api/challenge';

// 탭 정의
const challengeTabs = [
    { id: 'duduk', label: '두둑 챌린지' },
    { id: 'ai', label: 'AI 맞춤' },
    { id: 'ongoing', label: '도전 중' },
    { id: 'failed', label: '실패' },
];

// 필터 정의
const challengeFilters = [
    { id: 'saving', label: '최고절약' },
    { id: 'popular', label: '인기 성공' },
    { id: 'failed', label: '다수 실패' },
];

export default function ChallengePage() {
    const [activeTab, setActiveTab] = useState('duduk');
    const [activeFilter, setActiveFilter] = useState('saving');
    const [userPoints, setUserPoints] = useState(0);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 포인트 조회
    const fetchUserPoints = useCallback(async () => {
        try {
            const data = await getUserPoints();
            setUserPoints(data.points);
        } catch (err) {
            console.error('포인트 조회 실패:', err);
        }
    }, []);

    // 챌린지 데이터 로드
    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let data = [];
            switch (activeTab) {
                case 'duduk':
                    data = await getChallenges('duduk');
                    // 필터 적용 (saving은 모든 챌린지, popular/failed는 해당 키워드만)
                    if (activeFilter === 'popular') {
                        data = data.filter(c => c.category === 'popular_success');
                    } else if (activeFilter === 'failed') {
                        data = data.filter(c => c.category === 'many_fail' || c.difficulty === '어려움');
                    }
                    // saving 필터는 모든 챌린지 표시 (기본값)
                    break;
                case 'ai':
                    data = await getAIChallenges();
                    break;
                case 'ongoing':
                    data = await getMyChallenges('in_progress');
                    break;
                case 'failed':
                    data = await getMyChallenges('failed');
                    break;
                default:
                    data = await getChallenges('duduk');
            }
            setChallenges(data);
        } catch (err) {
            console.error('챌린지 로드 실패:', err);
            setError('챌린지를 불러오는데 실패했습니다.');
            setChallenges([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeFilter]);

    // 초기 로드
    useEffect(() => {
        fetchUserPoints();
    }, [fetchUserPoints]);

    // 탭/필터 변경 시 데이터 로드
    useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);

    const handleCardClick = (challenge) => {
        setSelectedChallenge(challenge);
    };

    const handleCloseModal = () => {
        setSelectedChallenge(null);
    };

    const handleStartChallenge = async (challenge) => {
        try {
            // AI 챌린지인지 확인 (aiReason이 있으면 AI 챌린지)
            if (challenge.aiReason) {
                await startAIChallenge(challenge.id);
            } else {
                await startChallenge(challenge.id);
            }
            // 성공 시 데이터 새로고침
            await fetchChallenges();
            await fetchUserPoints();
            setSelectedChallenge(null);
            alert('챌린지가 시작되었습니다!');
        } catch (err) {
            console.error('챌린지 시작 실패:', err);
            alert(err.response?.data?.error || '챌린지 시작에 실패했습니다.');
        }
    };

    const handleRetryChallenge = async (challenge) => {
        // 재도전 = 동일한 챌린지 다시 시작
        // 실패한 챌린지의 원본 챌린지를 찾아서 시작
        try {
            await startChallenge(challenge.id);
            await fetchChallenges();
            await fetchUserPoints();
            setSelectedChallenge(null);
            alert('챌린지를 재도전합니다!');
        } catch (err) {
            console.error('재도전 실패:', err);
            alert(err.response?.data?.error || '재도전에 실패했습니다.');
        }
    };

    const handleCreateChallenge = () => {
        // TODO: 챌린지 만들기 모달/페이지
        alert('나만의 챌린지 만들기 기능은 준비 중입니다.');
    };

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            {/* <ChallengeHeader title="챌린지" points={userPoints} /> (Removed: using GlobalHeader) */}

            {/* 탭 네비게이션 */}
            <ChallengeTabs
                tabs={challengeTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* 필터 (두둑 챌린지에서만 표시) */}
            {activeTab === 'duduk' && (
                <ChallengeFilters
                    filters={challengeFilters}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            )}

            {/* 챌린지 만들기 버튼 */}
            <button style={styles.createButton} onClick={handleCreateChallenge}>
                <Plus size={18} />
                <span>나만의 챌린지 만들기</span>
            </button>

            {/* 로딩 상태 */}
            {loading && (
                <div style={styles.loadingState}>
                    <p>로딩 중...</p>
                </div>
            )}

            {/* 에러 상태 */}
            {error && (
                <div style={styles.errorState}>
                    <p>{error}</p>
                    <button onClick={fetchChallenges} style={styles.retryButton}>
                        다시 시도
                    </button>
                </div>
            )}

            {/* 챌린지 카드 그리드 */}
            {!loading && !error && (
                <div style={styles.cardGrid}>
                    {challenges.map((challenge) => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            onClick={handleCardClick}
                            onStart={handleStartChallenge}
                            onRetry={handleRetryChallenge}
                        />
                    ))}
                </div>
            )}

            {/* 빈 상태 */}
            {!loading && !error && challenges.length === 0 && (
                <div style={styles.emptyState}>
                    <p>해당하는 챌린지가 없습니다.</p>
                </div>
            )}

            {/* 하단 여백 (BottomNavigation 위) */}
            <div style={{ height: '100px' }}></div>

            {/* 챌린지 상세 모달 */}
            {selectedChallenge && (
                <ChallengeDetailModal
                    challenge={selectedChallenge}
                    onClose={handleCloseModal}
                    onStart={handleStartChallenge}
                    onRetry={handleRetryChallenge}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '1rem',
        minHeight: '100vh',
        backgroundColor: 'var(--background-light)',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: '100%',
        padding: '10px',
        marginBottom: '1rem',
        borderRadius: '12px',
        border: '2px dashed var(--primary)',
        backgroundColor: 'rgba(47, 133, 90, 0.05)',
        color: 'var(--primary)',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    cardGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
    },
    emptyState: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
        color: 'var(--text-sub)',
    },
    loadingState: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
        color: 'var(--text-sub)',
    },
    errorState: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
        color: 'var(--error)',
        gap: '1rem',
    },
    retryButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--primary)',
        color: 'white',
        cursor: 'pointer',
    },
};
