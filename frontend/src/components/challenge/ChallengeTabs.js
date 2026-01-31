/**
 * [파일 역할]
 * - 챌린지 탭 네비게이션 컴포넌트
 * - 이미지 디자인에 맞게 버튼 스타일
 */

export default function ChallengeTabs({ tabs, activeTab, onTabChange }) {
    return (
        <div style={styles.tabContainer}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: isActive ? '#1F2937' : 'white',
                            color: isActive ? 'white' : '#6B7280',
                            border: isActive ? 'none' : '1px solid #E5E7EB',
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

const styles = {
    tabContainer: {
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',              // 가로 스크롤 활성화
        flexWrap: 'nowrap',             // 줄바꿈 방지
        justifyContent: 'flex-start',   // 왼쪽 정렬
        scrollbarWidth: 'none',         // Firefox 스크롤바 숨김
        msOverflowStyle: 'none',        // IE 스크롤바 숨김
        WebkitOverflowScrolling: 'touch', // iOS 부드러운 스크롤
        padding: '4px 8px',             // 좌우 여백 추가
    },
    tabButton: {
        padding: '8px 14px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,                  // 버튼 크기 유지 (축소 방지)
    },
};
