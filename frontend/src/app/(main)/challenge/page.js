"use client";

/**
 * [파일 역할]
 * - 챌린지 페이지 메인 컴포넌트
 * - 컴포넌트들을 조합하여 페이지 구성
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';

// 컴포넌트
import ChallengeHeader from '@/components/challenge/ChallengeHeader';
import ChallengeTabs from '@/components/challenge/ChallengeTabs';
import ChallengeFilters from '@/components/challenge/ChallengeFilters';
import ChallengeCard from '@/components/challenge/ChallengeCard';

// 데이터
import {
    dudukChallenges,
    aiChallenges,
    ongoingChallenges,
    failedChallenges,
    challengeTabs,
    challengeFilters,
} from '@/components/challenge/challengeData';

export default function ChallengePage() {
    const [activeTab, setActiveTab] = useState('duduk');
    const [activeFilter, setActiveFilter] = useState('saving');
    const [userPoints, setUserPoints] = useState(2350);

    // 현재 탭에 따른 챌린지 데이터
    const getCurrentChallenges = () => {
        switch (activeTab) {
            case 'duduk':
                if (activeFilter === 'saving') {
                    return dudukChallenges.filter(c => c.category === 'saving' || c.category === 'popular');
                } else if (activeFilter === 'popular') {
                    return dudukChallenges.filter(c => c.category === 'popular');
                } else {
                    return dudukChallenges.filter(c => c.category === 'failed' || c.difficulty === '어려움');
                }
            case 'ai':
                return aiChallenges;
            case 'ongoing':
                return ongoingChallenges;
            case 'failed':
                return failedChallenges;
            default:
                return dudukChallenges;
        }
    };

    const handleStartChallenge = (challenge) => {
        // TODO: 챌린지 시작 로직 (백엔드 연동)
        console.log('챌린지 시작:', challenge);
    };

    const handleRetryChallenge = (challenge) => {
        // TODO: 챌린지 재도전 로직 (백엔드 연동)
        console.log('챌린지 재도전:', challenge);
    };

    const handleCreateChallenge = () => {
        // TODO: 챌린지 만들기 모달/페이지 (백엔드 연동)
        console.log('챌린지 만들기');
    };

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <ChallengeHeader title="챌린지" points={userPoints} />

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

            {/* 챌린지 카드 그리드 */}
            <div style={styles.cardGrid}>
                {getCurrentChallenges().map((challenge) => (
                    <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        onStart={handleStartChallenge}
                        onRetry={handleRetryChallenge}
                    />
                ))}
            </div>

            {/* 빈 상태 */}
            {getCurrentChallenges().length === 0 && (
                <div style={styles.emptyState}>
                    <p>해당하는 챌린지가 없습니다.</p>
                </div>
            )}

            {/* 하단 여백 (BottomNavigation 위) */}
            <div style={{ height: '100px' }}></div>
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
};
