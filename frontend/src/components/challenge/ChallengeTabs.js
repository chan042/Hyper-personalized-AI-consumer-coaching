/**
 * [파일 역할]
 * - 챌린지 탭 네비게이션 컴포넌트
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
                            color: isActive ? 'var(--primary)' : 'var(--text-sub)',
                            borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: isActive ? '600' : '500',
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
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '1rem',
    },
    tabButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
};
