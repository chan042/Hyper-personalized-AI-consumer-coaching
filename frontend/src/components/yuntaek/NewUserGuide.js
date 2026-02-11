"use client";

import { memo } from 'react';

export default memo(function NewUserGuide({ guide }) {
    if (!guide) return null;

    return (
        <div style={styles.container}>
            {/* 시작 가이드 */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>{guide.title}</h3>
                <ol style={styles.orderedList}>
                    {guide.steps.map((step, index) => {
                        // "지출 기록하기:", "예산 설정하기:", "챌린지 참여:" 부분을 볼드처리
                        const parts = step.split(':');
                        return (
                            <li key={index} style={styles.listItem}>
                                {parts.length > 1 ? (
                                    <>
                                        <strong>{parts[0]}</strong>:{parts.slice(1).join(':')}
                                    </>
                                ) : (
                                    step
                                )}
                            </li>
                        );
                    })}
                </ol>
            </div>

            {/* 팁 */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>💡 팁</h3>
                <ul style={styles.unorderedList}>
                    {guide.tips.map((tip, index) => (
                        <li key={index} style={styles.listItem}>
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
});

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        margin: 0,
    },
    orderedList: {
        margin: 0,
        paddingLeft: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    unorderedList: {
        margin: 0,
        paddingLeft: '1.5rem',
        listStyleType: 'disc',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    listItem: {
        fontSize: '0.95rem',
        lineHeight: '1.6',
        color: '#334155',
    },
};
