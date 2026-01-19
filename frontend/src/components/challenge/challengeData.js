/**
 * [파일 역할]
 * - 챌린지 더미 데이터 (백엔드 연동 전 테스트용)
 * - 나중에 API 호출로 교체 예정
 */

// 두둑 챌린지 더미 데이터
export const dudukChallenges = [
    {
        id: 1,
        title: '온라인 쇼핑 할인 활용',
        points: 500,
        difficulty: '보통',
        icon: 'shopping',
        color: '#E8F4FD',
        iconColor: '#3B82F6',
        category: 'saving'
    },
    {
        id: 2,
        title: '편의점 간식 줄이기',
        points: 300,
        difficulty: '쉬움',
        icon: 'snack',
        color: '#FEF3C7',
        iconColor: '#F59E0B',
        category: 'popular'
    },
    {
        id: 3,
        title: '일주일 무지출 챌린지',
        points: 1000,
        difficulty: '어려움',
        icon: 'wallet',
        color: '#D1FAE5',
        iconColor: '#10B981',
        category: 'saving'
    },
    {
        id: 4,
        title: '커피 배달 안 시키기',
        points: 450,
        difficulty: '보통',
        icon: 'coffee',
        color: '#FCE7F3',
        iconColor: '#EC4899',
        category: 'popular'
    },
    {
        id: 5,
        title: '가까운 거리 걸어다니기',
        points: 200,
        difficulty: '쉬움',
        icon: 'walk',
        color: '#DBEAFE',
        iconColor: '#6366F1',
        category: 'failed'
    },
    {
        id: 6,
        title: '가계부 매일 작성하기',
        points: 600,
        difficulty: '보통',
        icon: 'document',
        color: '#F3E8FF',
        iconColor: '#A855F7',
        category: 'popular'
    },
    {
        id: 7,
        title: '3만원의 행복',
        points: 800,
        difficulty: '어려움',
        icon: 'target',
        color: '#FEE2E2',
        iconColor: '#EF4444',
        category: 'saving'
    },
    {
        id: 8,
        title: '배달음식 줄이기',
        points: 400,
        difficulty: '보통',
        icon: 'food',
        color: '#FFEDD5',
        iconColor: '#F97316',
        category: 'popular'
    },
];

// AI 맞춤 챌린지 더미 데이터
export const aiChallenges = [
    {
        id: 101,
        title: '주 3회 자취 요리하기',
        points: 550,
        difficulty: '보통',
        icon: 'food',
        color: '#DBEAFE',
        iconColor: '#3B82F6',
        aiReason: '코칭 분석 기반'
    },
    {
        id: 102,
        title: '교통비 20% 절약',
        points: 350,
        difficulty: '쉬움',
        icon: 'walk',
        color: '#D1FAE5',
        iconColor: '#10B981',
        aiReason: '지출 패턴 분석'
    },
];

// 도전 중인 챌린지 더미 데이터
export const ongoingChallenges = [
    {
        id: 201,
        title: '일주일 무지출 챌린지',
        points: 1000,
        difficulty: '어려움',
        icon: 'wallet',
        color: '#D1FAE5',
        iconColor: '#10B981',
        progress: 60,
        daysLeft: 3
    },
];

// 실패한 챌린지 더미 데이터
export const failedChallenges = [
    {
        id: 301,
        title: '편의점 간식 줄이기',
        points: 300,
        difficulty: '쉬움',
        icon: 'snack',
        color: '#FEE2E2',
        iconColor: '#EF4444',
        failedDate: '2026.01.15'
    },
];

// 탭 정의
export const challengeTabs = [
    { id: 'duduk', label: '두둑 챌린지' },
    { id: 'ai', label: 'AI 맞춤' },
    { id: 'ongoing', label: '도전 중' },
    { id: 'failed', label: '실패' },
];

// 필터 정의
export const challengeFilters = [
    { id: 'saving', label: '최고절약' },
    { id: 'popular', label: '인기 성공' },
    { id: 'failed', label: '다수 실패' },
];
