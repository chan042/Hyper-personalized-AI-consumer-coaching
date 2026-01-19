/**
 * [파일 역할]
 * - 챌린지 상세 모달 컴포넌트
 * - 챌린지 카드 클릭 시 표시되는 팝업
 */
import { X, Sparkles, ShoppingCart, Utensils, Wallet, Coffee, MapPin, FileText, Target, Dumbbell, Zap, Clock } from 'lucide-react';

// 아이콘 컴포넌트 매핑
const getIcon = (iconName, color) => {
    const iconProps = { size: 48, color };
    switch (iconName) {
        case 'shopping': return <ShoppingCart {...iconProps} />;
        case 'food': return <Utensils {...iconProps} />;
        case 'wallet': return <Wallet {...iconProps} />;
        case 'coffee': return <Coffee {...iconProps} />;
        case 'walk': return <MapPin {...iconProps} />;
        case 'document': return <FileText {...iconProps} />;
        case 'target': return <Target {...iconProps} />;
        case 'snack': return <Dumbbell {...iconProps} />;
        default: return <Zap {...iconProps} />;
    }
};

// 난이도 배지 스타일
const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
        case '쉬움':
            return { backgroundColor: '#DCFCE7', color: '#16A34A' };
        case '보통':
            return { backgroundColor: '#E0E7FF', color: '#4F46E5' };
        case '어려움':
            return { backgroundColor: '#FEE2E2', color: '#DC2626' };
        default:
            return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
};

export default function ChallengeDetailModal({ challenge, onClose, onStart, onRetry }) {
    if (!challenge) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div style={styles.overlay} onClick={handleOverlayClick}>
            <div style={styles.modal}>
                {/* 닫기 버튼 */}
                <button style={styles.closeButton} onClick={onClose}>
                    <X size={24} />
                </button>

                {/* 상단 아이콘 영역 */}
                <div style={{
                    ...styles.iconArea,
                    backgroundColor: challenge.color,
                }}>
                    <div style={styles.iconContainer}>
                        {getIcon(challenge.icon, challenge.iconColor)}
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <div style={styles.content}>
                    {/* 난이도 배지 */}
                    <div style={{
                        ...styles.difficultyBadge,
                        ...getDifficultyStyle(challenge.difficulty),
                    }}>
                        {challenge.difficulty}
                    </div>

                    {/* 타이틀 */}
                    <h2 style={styles.title}>{challenge.title}</h2>

                    {/* 포인트 & 기간 */}
                    <div style={styles.infoRow}>
                        <div style={styles.points}>
                            <span style={styles.pointsValue}>{challenge.points}</span>
                            <span style={styles.pointsLabel}>P</span>
                        </div>
                        {challenge.duration && (
                            <div style={styles.duration}>
                                <Clock size={14} color="var(--text-sub)" />
                                <span>{challenge.duration}</span>
                            </div>
                        )}
                    </div>

                    {/* AI 추천 이유 */}
                    {challenge.aiReason && (
                        <div style={styles.aiReason}>
                            <Sparkles size={14} color="var(--primary)" />
                            <span>{challenge.aiReason}</span>
                        </div>
                    )}

                    {/* 설명 */}
                    <p style={styles.description}>
                        {challenge.description || '이 챌린지에 대한 상세 설명이 없습니다.'}
                    </p>

                    {/* 진행률 (도전 중인 경우) */}
                    {challenge.progress !== undefined && (
                        <div style={styles.progressSection}>
                            <div style={styles.progressHeader}>
                                <span>진행률</span>
                                <span>{challenge.progress}%</span>
                            </div>
                            <div style={styles.progressBar}>
                                <div style={{
                                    ...styles.progressFill,
                                    width: `${challenge.progress}%`,
                                }} />
                            </div>
                            <span style={styles.daysLeft}>{challenge.daysLeft}일 남음</span>
                        </div>
                    )}

                    {/* 실패 날짜 */}
                    {challenge.failedDate && (
                        <div style={styles.failedInfo}>
                            {challenge.failedDate} 실패
                        </div>
                    )}

                    {/* 버튼 */}
                    <div style={styles.buttonContainer}>
                        {!challenge.progress && !challenge.failedDate && (
                            <button
                                style={styles.startButton}
                                onClick={() => {
                                    onStart?.(challenge);
                                    onClose();
                                }}
                            >
                                챌린지 시작하기
                            </button>
                        )}
                        {challenge.failedDate && (
                            <button
                                style={styles.retryButton}
                                onClick={() => {
                                    onRetry?.(challenge);
                                    onClose();
                                }}
                            >
                                다시 도전하기
                            </button>
                        )}
                        {challenge.progress !== undefined && (
                            <button style={styles.continueButton}>
                                계속하기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '360px',
        maxHeight: '90vh',
        overflow: 'hidden',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(255,255,255,0.9)',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    iconArea: {
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: '1.5rem',
    },
    difficultyBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        marginBottom: '8px',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '12px',
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
    },
    points: {
        display: 'flex',
        alignItems: 'baseline',
    },
    pointsValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: 'var(--primary)',
    },
    pointsLabel: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--primary)',
        marginLeft: '2px',
    },
    duration: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.875rem',
        color: 'var(--text-sub)',
    },
    aiReason: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.85rem',
        color: 'var(--primary)',
        backgroundColor: 'rgba(47, 133, 90, 0.1)',
        padding: '6px 12px',
        borderRadius: '8px',
        marginBottom: '16px',
    },
    description: {
        fontSize: '0.95rem',
        lineHeight: '1.6',
        color: 'var(--text-sub)',
        marginBottom: '20px',
    },
    progressSection: {
        marginBottom: '16px',
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: 'var(--text-main)',
        marginBottom: '8px',
    },
    progressBar: {
        width: '100%',
        height: '8px',
        backgroundColor: '#E2E8F0',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'var(--primary)',
        borderRadius: '4px',
        transition: 'width 0.3s ease',
    },
    daysLeft: {
        fontSize: '0.8rem',
        color: 'var(--text-sub)',
        marginTop: '4px',
        display: 'block',
    },
    failedInfo: {
        fontSize: '0.9rem',
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
        padding: '8px 12px',
        borderRadius: '8px',
        marginBottom: '16px',
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: '8px',
    },
    startButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: 'var(--primary)',
        color: 'white',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    retryButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: '#EF4444',
        color: 'white',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    continueButton: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: 'var(--primary)',
        color: 'white',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
};
