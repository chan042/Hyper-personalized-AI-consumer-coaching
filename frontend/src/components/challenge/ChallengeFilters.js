/**
 * [파일 역할]
 * - 챌린지 필터 컴포넌트 (두둑 챌린지에서만 사용)
 */

export default function ChallengeFilters({ filters, activeFilter, onFilterChange }) {
    return (
        <div style={styles.filterContainer}>
            {filters.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    style={{
                        ...styles.filterButton,
                        backgroundColor: activeFilter === filter.id ? 'var(--primary)' : 'white',
                        color: activeFilter === filter.id ? 'white' : 'var(--text-sub)',
                        border: activeFilter === filter.id ? 'none' : '1px solid #E2E8F0',
                    }}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
}

const styles = {
    filterContainer: {
        display: 'flex',
        gap: '8px',
        marginBottom: '1rem',
    },
    filterButton: {
        padding: '6px 14px',
        borderRadius: '16px',
        fontSize: '0.8rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
};
