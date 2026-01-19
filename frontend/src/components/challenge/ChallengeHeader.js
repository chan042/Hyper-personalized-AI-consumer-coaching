/**
 * [파일 역할]
 * - 챌린지 헤더 컴포넌트 (타이틀 + 포인트 배지)
 */
import { Coins } from 'lucide-react';

export default function ChallengeHeader({ title, points }) {
    return (
        <div style={styles.header}>
            <h1 style={styles.title}>{title}</h1>
            <div style={styles.pointsBadge}>
                <Coins size={16} color="var(--primary)" />
                <span style={styles.pointsText}>{points.toLocaleString()}P</span>
            </div>
        </div>
    );
}

const styles = {
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: '1rem',
        paddingTop: '0.5rem',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--text-main)',
    },
    pointsBadge: {
        position: 'absolute',
        right: '0',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'white',
        padding: '6px 12px',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    pointsText: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'var(--primary)',
    },
};
