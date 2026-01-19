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
        description: '온라인 쇼핑 시 할인 쿠폰, 적립금, 카드 혜택 등을 적극 활용해보세요. 같은 물건도 더 저렴하게 구매할 수 있습니다!',
        points: 500,
        difficulty: '보통',
        icon: 'shopping',
        color: '#E8F4FD',
        iconColor: '#3B82F6',
        category: 'saving',
        duration: '2주'
    },
    {
        id: 2,
        title: '편의점 간식 줄이기',
        description: '매일 습관처럼 사는 편의점 간식! 일주일에 3번 이하로 줄여보세요. 작은 습관이 큰 절약으로 이어집니다.',
        points: 300,
        difficulty: '쉬움',
        icon: 'snack',
        color: '#FEF3C7',
        iconColor: '#F59E0B',
        category: 'popular',
        duration: '1주'
    },
    {
        id: 3,
        title: '일주일 무지출 챌린지',
        description: '필수 지출(교통비, 식비 제외)을 제외하고 일주일 동안 불필요한 소비를 하지 않는 챌린지입니다. 정말 필요한 것만 구매하는 습관을 길러보세요!',
        points: 1000,
        difficulty: '어려움',
        icon: 'wallet',
        color: '#D1FAE5',
        iconColor: '#10B981',
        category: 'saving',
        duration: '1주'
    },
    {
        id: 4,
        title: '커피 배달 안 시키기',
        description: '배달앱으로 커피를 시키면 배달비까지 추가됩니다. 직접 카페에 방문하거나 집에서 만들어 마셔보세요!',
        points: 450,
        difficulty: '보통',
        icon: 'coffee',
        color: '#FCE7F3',
        iconColor: '#EC4899',
        category: 'popular',
        duration: '2주'
    },
    {
        id: 5,
        title: '가까운 거리 걸어다니기',
        description: '1km 이내의 거리는 택시나 버스 대신 걸어보세요. 교통비도 아끼고 건강도 챙길 수 있는 일석이조 챌린지!',
        points: 200,
        difficulty: '쉬움',
        icon: 'walk',
        color: '#DBEAFE',
        iconColor: '#6366F1',
        category: 'failed',
        duration: '1주'
    },
    {
        id: 6,
        title: '가계부 매일 작성하기',
        description: '매일 지출 내역을 기록하면 소비 패턴을 파악할 수 있습니다. 두둑 앱에서 간편하게 기록해보세요!',
        points: 600,
        difficulty: '보통',
        icon: 'document',
        color: '#F3E8FF',
        iconColor: '#A855F7',
        category: 'popular',
        duration: '1개월'
    },
    {
        id: 7,
        title: '3만원의 행복',
        description: '일주일 용돈을 3만원으로 제한해보세요. 제한된 예산 안에서 효율적인 소비 습관을 기를 수 있습니다.',
        points: 800,
        difficulty: '어려움',
        icon: 'target',
        color: '#FEE2E2',
        iconColor: '#EF4444',
        category: 'saving',
        duration: '1주'
    },
    {
        id: 8,
        title: '배달음식 줄이기',
        description: '배달음식은 편리하지만 배달비와 포장비가 추가됩니다. 주 2회 이하로 줄이고 직접 요리해보세요!',
        points: 400,
        difficulty: '보통',
        icon: 'food',
        color: '#FFEDD5',
        iconColor: '#F97316',
        category: 'popular',
        duration: '2주'
    },
];

// AI 맞춤 챌린지 더미 데이터
export const aiChallenges = [
    {
        id: 101,
        title: '주 3회 자취 요리하기',
        description: '외식과 배달 대신 직접 요리하면 건강도 챙기고 비용도 절약할 수 있어요. 간단한 요리부터 시작해보세요!',
        points: 550,
        difficulty: '보통',
        icon: 'food',
        color: '#DBEAFE',
        iconColor: '#3B82F6',
        aiReason: '코칭 분석 기반',
        duration: '1주'
    },
    {
        id: 102,
        title: '교통비 20% 절약',
        description: '대중교통 정기권 활용, 가까운 거리 도보 이동 등으로 교통비를 줄여보세요!',
        points: 350,
        difficulty: '쉬움',
        icon: 'walk',
        color: '#D1FAE5',
        iconColor: '#10B981',
        aiReason: '지출 패턴 분석',
        duration: '1개월'
    },
];

// 도전 중인 챌린지 더미 데이터
export const ongoingChallenges = [
    {
        id: 201,
        title: '일주일 무지출 챌린지',
        description: '필수 지출을 제외하고 일주일 동안 불필요한 소비를 하지 않는 챌린지입니다.',
        points: 1000,
        difficulty: '어려움',
        icon: 'wallet',
        color: '#D1FAE5',
        iconColor: '#10B981',
        progress: 60,
        daysLeft: 3,
        duration: '1주'
    },
];

// 실패한 챌린지 더미 데이터
export const failedChallenges = [
    {
        id: 301,
        title: '편의점 간식 줄이기',
        description: '매일 습관처럼 사는 편의점 간식을 일주일에 3번 이하로 줄여보는 챌린지입니다.',
        points: 300,
        difficulty: '쉬움',
        icon: 'snack',
        color: '#FEE2E2',
        iconColor: '#EF4444',
        failedDate: '2026.01.15',
        duration: '1주'
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
