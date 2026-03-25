"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import MissionDetailModal from '@/components/challenge-battle/MissionDetailModal';
import { getCurrentBattleProgress } from '@/lib/api/battle';


const PROGRESS_REFRESH_MS = 10000;
const DEFAULT_CHARACTER_TYPE = 'char_cat';

function getCharacterImagePath(characterType, imageName = 'face_happy') {
    const normalizedCharacterType = String(characterType || DEFAULT_CHARACTER_TYPE).trim().toLowerCase();
    const resolvedCharacterType = normalizedCharacterType.startsWith('char_')
        ? normalizedCharacterType
        : `char_${normalizedCharacterType || 'cat'}`;
    const resolvedImageName = String(imageName || 'face_happy').replace(/\.png$/i, '');

    return `/images/characters/${resolvedCharacterType}/${resolvedImageName}.png`;
}

function getMissionDisplayStatus(status) {
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

function getMissionSummaryText(mission) {
    if (mission.status === 'WON') {
        return `${mission.winner_name || '상대'} 성공`;
    }
    if (mission.status === 'DRAW') {
        return '동시 달성';
    }
    if (mission.status === 'EXPIRED') {
        return '종료됨';
    }
    return '';
}

export default function BattleProgressPage() {
    const router = useRouter();
    const [battleData, setBattleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMission, setSelectedMission] = useState(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function loadBattleProgress() {
            try {
                if (!cancelled && !hasLoadedRef.current) {
                    setLoading(true);
                }

                const data = await getCurrentBattleProgress();
                if (!cancelled) {
                    setBattleData(data);
                    setError('');
                    hasLoadedRef.current = true;
                }
            } catch (requestError) {
                if (cancelled) {
                    return;
                }

                if (requestError?.response?.status === 404) {
                    router.replace('/challenge-battle/search?screen=intro');
                    return;
                }

                setError(
                    requestError?.response?.data?.detail ||
                    '대결 진행 정보를 불러오지 못했습니다.'
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadBattleProgress();

        const intervalId = window.setInterval(loadBattleProgress, PROGRESS_REFRESH_MS);
        const handleFocus = () => loadBattleProgress();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadBattleProgress();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [router]);

    const ongoingMissions = useMemo(
        () => (battleData?.missions || []).filter((mission) => mission.status === 'OPEN'),
        [battleData]
    );
    const finishedMissions = useMemo(
        () => (battleData?.missions || []).filter((mission) => mission.status !== 'OPEN'),
        [battleData]
    );

    if (loading && !battleData) {
        return (
            <div style={styles.container}>
                <div style={styles.centerMessage}>대결 진행 정보를 불러오는 중입니다...</div>
            </div>
        );
    }

    if (!battleData) {
        return (
            <div style={styles.container}>
                <div style={styles.centerMessage}>{error || '대결 정보를 찾지 못했습니다.'}</div>
            </div>
        );
    }

    const isTie = battleData.me.current_score === battleData.opponent.current_score;
    const isMeWinning = battleData.me.current_score > battleData.opponent.current_score;
    const leadName = isTie ? null : (isMeWinning ? battleData.me.name : battleData.opponent.name);

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.topSection}>
                    <p style={styles.dDaySubtitle}>
                        {battleData.status === 'WAITING_FOR_SCORE' ? '결과 계산 중' : '대결 종료까지'}
                    </p>
                    <h1 style={styles.dDayTitle}>
                        {battleData.status === 'WAITING_FOR_SCORE' ? '집계 중' : `D-${battleData.d_day}일`}
                    </h1>
                </div>

                <div style={styles.battleArena}>
                    <div style={styles.profileCol}>
                        <div style={styles.profileAvatar}>
                            <img
                                src={getCharacterImagePath(battleData.me.character_type)}
                                alt={`${battleData.me.name} 캐릭터`}
                                style={styles.profileAvatarImage}
                            />
                        </div>
                        <span style={styles.profileName}>{battleData.me.name} (나)</span>
                    </div>

                    <div style={styles.vsBadge}>VS</div>

                    <div style={styles.profileCol}>
                        <div style={styles.profileAvatar}>
                            <img
                                src={getCharacterImagePath(battleData.opponent.character_type)}
                                alt={`${battleData.opponent.name} 캐릭터`}
                                style={styles.profileAvatarImage}
                            />
                        </div>
                        <span style={styles.profileName}>{battleData.opponent.name}</span>
                    </div>
                </div>

                <div style={styles.battleStatus}>
                    <p style={styles.statusText}>
                        <span style={styles.highlightText}>
                            {battleData.me.current_score} : {battleData.opponent.current_score}
                        </span>
                        {' '}
                        {isTie ? '현재 동점이에요.' : `${leadName}님이 앞서고 있어요.`}
                    </p>
                    {battleData.status === 'WAITING_FOR_SCORE' ? (
                        <p style={styles.encourageText}>월말 점수 집계가 끝나면 결과 페이지로 넘어갑니다.</p>
                    ) : finishedMissions.length === 0 ? (
                        <p style={styles.encourageText}>
                            {battleData.opponent.name}님보다 먼저 미션을 성공해보세요.
                        </p>
                    ) : null}
                </div>

                {error && <p style={styles.inlineError}>{error}</p>}

                <div style={styles.missionSection}>
                    <div style={styles.missionGroup}>
                        <h3 style={styles.groupTitle}>진행 중인 미션</h3>
                        <div style={styles.missionList}>
                            {ongoingMissions.length > 0 ? (
                                ongoingMissions.map((mission) => (
                                    <div
                                        key={mission.id}
                                        style={styles.missionCard}
                                        onClick={() => setSelectedMission(mission)}
                                    >
                                        <div style={styles.missionCardContent}>
                                            <div style={styles.missionHeader}>
                                                <span style={styles.badgeOngoing}>ONGOING</span>
                                            </div>
                                            <h4 style={styles.missionCardTitle}>{mission.title}</h4>
                                        </div>
                                        <ChevronRight size={20} color="var(--text-guide)" />
                                    </div>
                                ))
                            ) : (
                                <div style={styles.emptyMissionCard}>현재 진행 중인 미션이 없습니다.</div>
                            )}
                        </div>
                    </div>

                    <div style={styles.missionGroup}>
                        <h3 style={styles.groupTitle}>완료된 미션</h3>
                        <div style={styles.missionList}>
                            {finishedMissions.length > 0 ? (
                                finishedMissions.map((mission) => (
                                    <div
                                        key={mission.id}
                                        style={{ ...styles.missionCard, opacity: 0.78 }}
                                        onClick={() => setSelectedMission(mission)}
                                    >
                                        <div style={styles.missionCardContent}>
                                            <div style={styles.missionHeader}>
                                                <span style={styles.badgeFinished}>
                                                    {getMissionDisplayStatus(mission.status)}
                                                </span>
                                            </div>
                                            <h4 style={styles.missionCardTitle}>{mission.title}</h4>
                                        </div>
                                        <div style={styles.missionRightArea}>
                                            <span style={styles.winnerSummary}>{getMissionSummaryText(mission)}</span>
                                            <ChevronRight size={20} color="var(--text-guide)" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={styles.emptyMissionCard}>아직 완료된 미션이 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <MissionDetailModal
                isOpen={!!selectedMission}
                onClose={() => setSelectedMission(null)}
                mission={selectedMission || {}}
            />
        </div>
    );
}

const styles = {
    container: {
        background: '#f8fafc',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
    },
    content: {
        flex: 1,
        padding: '1.5rem',
        paddingTop: '0.5rem',
        paddingBottom: 'calc(108px + env(safe-area-inset-bottom, 0px))',
    },
    centerMessage: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-sub)',
        fontSize: '1rem',
        fontWeight: '600',
        padding: '2rem',
        textAlign: 'center',
    },
    topSection: {
        textAlign: 'center',
        marginBottom: '2rem',
    },
    dDaySubtitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-sub)',
        margin: 0,
        marginBottom: '0.25rem',
    },
    dDayTitle: {
        fontSize: '3rem',
        fontWeight: '800',
        color: 'var(--primary)',
        margin: 0,
        lineHeight: 1,
    },
    battleArena: {
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        marginBottom: '1rem',
    },
    vsBadge: {
        background: '#f1f5f9',
        color: 'var(--text-sub)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '800',
        letterSpacing: '1px',
        alignSelf: 'center',
        flexShrink: 0,
    },
    profileCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        maxWidth: '120px',
    },
    profileAvatar: {
        width: '72px',
        height: '72px',
        borderRadius: '24px',
        background: 'var(--primary-light)',
        opacity: 0.8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.5rem',
        overflow: 'hidden',
    },
    profileAvatarImage: {
        width: '56px',
        height: '56px',
        objectFit: 'contain',
    },
    profileName: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        marginBottom: '0.25rem',
    },
    battleStatus: {
        textAlign: 'center',
        marginBottom: '2rem',
    },
    statusText: {
        fontSize: '1.05rem',
        color: 'var(--text-main)',
        fontWeight: '500',
        margin: 0,
    },
    highlightText: {
        fontWeight: '800',
        color: 'var(--primary)',
        fontSize: '1.15rem',
    },
    encourageText: {
        fontSize: '0.95rem',
        color: 'var(--text-guide)',
        marginTop: '0.5rem',
        fontWeight: '600',
    },
    inlineError: {
        margin: '0 0 1.25rem',
        fontSize: '0.88rem',
        fontWeight: '600',
        color: '#ef4444',
        textAlign: 'center',
    },
    missionSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
    },
    missionGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    groupTitle: {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        margin: 0,
    },
    missionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    missionCard: {
        background: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.2s',
    },
    emptyMissionCard: {
        background: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--text-sub)',
        fontSize: '0.95rem',
        fontWeight: '600',
    },
    missionCardContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    missionRightArea: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    missionHeader: {
        display: 'flex',
        alignItems: 'center',
    },
    badgeOngoing: {
        fontSize: '0.75rem',
        fontWeight: '800',
        letterSpacing: '0.5px',
        color: '#3b82f6',
        background: '#eff6ff',
        padding: '4px 8px',
        borderRadius: '6px',
    },
    badgeFinished: {
        fontSize: '0.75rem',
        fontWeight: '800',
        letterSpacing: '0.5px',
        color: 'var(--text-sub)',
        background: '#f1f5f9',
        padding: '4px 8px',
        borderRadius: '6px',
    },
    missionCardTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        margin: 0,
    },
    winnerSummary: {
        fontSize: '0.85rem',
        color: 'var(--primary)',
        fontWeight: '600',
        margin: 0,
        marginTop: '0.25rem',
    },
};
