"use client";

import { memo } from 'react';

export default memo(function ScoreDetail({ details, isExpanded, showProgress }) {
    return (
        <div style={{
            maxHeight: isExpanded ? '500px' : '0',
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            marginBottom: isExpanded ? '1rem' : '0',
            paddingTop: isExpanded ? '1.5rem' : '0'
        }}>
            <div style={styles.detailList}>
                {details.map((item, index) => (
                    <div key={index} style={styles.detailItem}>
                        <div style={styles.detailTextRow}>
                            <span style={styles.detailLabel}>{item.label}</span>
                            <span style={styles.detailScoreText}>
                                <strong style={{ color: 'var(--text-main)' }}>{item.score}</strong>
                                <span style={{ color: 'var(--text-guide)' }}>/{item.max}</span>
                            </span>
                        </div>
                        <div style={styles.progressBarBg}>
                            <div
                                style={{
                                    ...styles.progressBarFill,
                                    width: isExpanded && showProgress ? `${(item.score / item.max) * 100}%` : '0%',
                                    backgroundColor: '#14b8a5',
                                    transitionDelay: `${index * 0.1}s`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const styles = {
    detailList: {
        marginTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0 0.5rem',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
    },
    detailTextRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    detailLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#475569',
    },
    detailScoreText: {
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    progressBarBg: {
        width: '100%',
        height: '6px',
        backgroundColor: '#f1f5f9',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
    },
};
