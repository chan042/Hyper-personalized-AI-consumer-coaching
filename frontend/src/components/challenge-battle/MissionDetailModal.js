"use client";

import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';


function getStatusBadgeLabel(status) {
    switch (status) {
        case 'WON':
            return '완료됨';
        case 'DRAW':
            return '무승부';
        case 'EXPIRED':
            return '종료됨';
        default:
            return '진행중';
    }
}

function getStatusSummary(mission) {
    if (mission.status === 'WON') {
        return (
            <p style={styles.finishedText}>
                <span style={styles.winnerName}>{mission.winner_name || '상대'}</span> 성공
            </p>
        );
    }

    if (mission.status === 'DRAW') {
        return <p style={styles.finishedText}>두 사용자가 동시에 달성했습니다.</p>;
    }

    if (mission.status === 'EXPIRED') {
        return <p style={styles.finishedText}>대결 기간이 끝나 이 미션은 종료되었습니다.</p>;
    }

    return (
        <p style={styles.ongoingText}>
            먼저 성공해서 3점의 보너스 점수를 확보해보세요!
        </p>
    );
}

export default function MissionDetailModal({ isOpen, onClose, mission }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = window.setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = '';
            }, 300);
            return () => {
                window.clearTimeout(timer);
                document.body.style.overflow = '';
            };
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isVisible && !isOpen) {
        return null;
    }

    const isFinished = mission.status && mission.status !== 'OPEN';

    return (
        <div
            style={{
                ...styles.overlay,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    ...styles.modalContainer,
                    transform: isOpen ? 'scale(1)' : 'scale(0.95)',
                    opacity: isOpen ? 1 : 0,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={styles.header}>
                    <h3 style={styles.title}>미션 상세</h3>
                    <button onClick={onClose} style={styles.closeButton}>
                        <X size={24} color="var(--text-main)" />
                    </button>
                </div>

                <div style={styles.content}>
                    <div style={styles.statusBadge(mission.status)}>
                        {getStatusBadgeLabel(mission.status)}
                    </div>
                    <h2 style={styles.missionTitle}>{mission.title}</h2>
                    <p style={styles.missionDescription}>{mission.description}</p>

                    <div style={styles.statusSection}>
                        {isFinished ? (
                            <div style={styles.finishedContainer}>
                                <CheckCircle size={28} color="var(--primary)" style={styles.finishedIcon} />
                                {getStatusSummary(mission)}
                            </div>
                        ) : (
                            <div style={styles.ongoingContainer}>
                                <div style={styles.ongoingIcon}>목표</div>
                                {getStatusSummary(mission)}
                            </div>
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
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        transition: 'opacity 0.3s ease-out',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '360px',
        maxHeight: '90vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        margin: 0,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        color: 'var(--text-sub)',
    },
    content: {
        padding: '1.5rem',
        paddingTop: 0,
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    statusBadge: (status) => ({
        alignSelf: 'flex-start',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '700',
        color: status === 'OPEN' ? '#3b82f6' : 'var(--text-sub)',
        backgroundColor: status === 'OPEN' ? '#eff6ff' : '#f1f5f9',
    }),
    missionTitle: {
        fontSize: '1.4rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        margin: 0,
        lineHeight: 1.3,
    },
    missionDescription: {
        fontSize: '1rem',
        color: 'var(--text-sub)',
        lineHeight: 1.6,
        margin: 0,
    },
    statusSection: {
        marginTop: '1rem',
        padding: '1.5rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#f8fafc',
    },
    ongoingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
    },
    ongoingIcon: {
        fontSize: '1rem',
        fontWeight: '700',
        color: 'var(--primary)',
        background: 'rgba(20, 184, 166, 0.12)',
        borderRadius: '999px',
        padding: '0.4rem 0.8rem',
    },
    ongoingText: {
        fontSize: '1.05rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        margin: 0,
        textAlign: 'center',
    },
    finishedContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
    },
    finishedIcon: {
        marginBottom: '0.25rem',
    },
    finishedText: {
        fontSize: '1.05rem',
        color: 'var(--text-main)',
        margin: 0,
        textAlign: 'center',
        lineHeight: 1.5,
    },
    winnerName: {
        fontWeight: '700',
        color: 'var(--primary)',
    },
};
