"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, X } from "lucide-react";

import { confirmBattleResult, getBattleResult } from "@/lib/api/battle";


const RESULT_REFRESH_MS = 10000;

const CATEGORY_META = {
    alternative: {
        title: "대안 행동 실현도",
        scoreKey: "alternative_action",
        maxScore: 20,
    },
    growth: {
        title: "성장",
        scoreKey: "growth_consumption",
        maxScore: 10,
    },
    health: {
        title: "건강 점수",
        scoreKey: "health_score",
        maxScore: 15,
    },
    challenge: {
        title: "챌린지",
        scoreKey: "challenge_success",
        maxScore: 3,
    },
};

const FULL_SCORE_ROWS = [
    { key: "budget_achievement", label: "예산 달성률", maxScore: 35 },
    { key: "alternative_action", label: "대안 행동 실현도", maxScore: 20 },
    { key: "health_score", label: "건강 점수", maxScore: 15 },
    { key: "growth_consumption", label: "성장", maxScore: 10 },
    { key: "leakage_improvement", label: "새는 지출", maxScore: 10 },
    { key: "spending_consistency", label: "소비 일관성", maxScore: 7 },
    { key: "challenge_success", label: "챌린지", maxScore: 3 },
];


function getPercent(value, maxScore) {
    if (!maxScore || maxScore <= 0) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round((value / maxScore) * 100)));
}


function getMissionStatusText(mission, myName) {
    if (mission.status === "DRAW") {
        return "무승부";
    }

    if (mission.status === "WON") {
        return `${mission.winner_name || myName} 성공`;
    }

    if (mission.status === "EXPIRED") {
        return "기간 종료";
    }

    return "성공자 없음";
}


function getMissionAccentColor(mission, myName) {
    if (mission.status === "DRAW") {
        return "var(--text-sub)";
    }

    if (mission.status === "WON" && mission.winner_name === myName) {
        return "var(--primary)";
    }

    if (mission.status === "WON") {
        return "#d97706";
    }

    return "var(--text-guide)";
}


export default function BattleResultPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const battleId = searchParams.get("battleId");

    const [resultData, setResultData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isConfirming, setIsConfirming] = useState(false);
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

    useEffect(() => {
        if (!battleId) {
            router.replace("/yuntaek-index");
            return;
        }

        let cancelled = false;

        async function loadBattleResult(showLoading = false) {
            try {
                if (!cancelled && showLoading) {
                    setLoading(true);
                }

                const data = await getBattleResult(battleId);
                if (!cancelled) {
                    setResultData(data);
                    setError("");
                }
            } catch (requestError) {
                if (cancelled) {
                    return;
                }

                if (requestError?.response?.status === 404) {
                    router.replace("/yuntaek-index");
                    return;
                }

                setError(
                    requestError?.response?.data?.detail ||
                    "대결 결과를 불러오지 못했습니다."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadBattleResult(true);

        const intervalId = window.setInterval(() => {
            if (resultData?.result_ready === false) {
                loadBattleResult(false);
            }
        }, RESULT_REFRESH_MS);

        const handleFocus = () => {
            if (resultData?.result_ready === false) {
                loadBattleResult(false);
            }
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
        };
    }, [battleId, resultData?.result_ready, router]);

    useEffect(() => {
        document.body.style.overflow = isScoreModalOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isScoreModalOpen]);

    const categoryMeta = resultData ? CATEGORY_META[resultData.category] : null;

    const selectedCategoryScores = useMemo(() => {
        if (!resultData?.result_ready || !categoryMeta) {
            return { me: 0, opponent: 0 };
        }

        const meBreakdown = resultData.me.official_score_snapshot?.breakdown || {};
        const opponentBreakdown = resultData.opponent.official_score_snapshot?.breakdown || {};

        return {
            me: meBreakdown[categoryMeta.scoreKey] || 0,
            opponent: opponentBreakdown[categoryMeta.scoreKey] || 0,
        };
    }, [categoryMeta, resultData]);

    const totalScores = useMemo(() => {
        if (!resultData?.result_ready) {
            return { me: 0, opponent: 0 };
        }

        return {
            me: resultData.me.official_score_snapshot?.total_score || 0,
            opponent: resultData.opponent.official_score_snapshot?.total_score || 0,
        };
    }, [resultData]);

    async function handleReplay() {
        if (!battleId || !resultData?.result_ready) {
            return;
        }

        try {
            setIsConfirming(true);
            await confirmBattleResult(battleId);
            router.push("/challenge-battle/search?screen=intro");
        } catch (requestError) {
            setError(
                requestError?.response?.data?.detail ||
                "결과 확인 처리에 실패했습니다."
            );
        } finally {
            setIsConfirming(false);
        }
    }

    if (loading && !resultData) {
        return (
            <div style={styles.container}>
                <div style={styles.centerMessage}>대결 결과를 불러오는 중입니다...</div>
            </div>
        );
    }

    if (!resultData) {
        return (
            <div style={styles.container}>
                <div style={styles.centerMessage}>{error || "대결 결과를 찾지 못했습니다."}</div>
            </div>
        );
    }

    if (!resultData.result_ready) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.topSection}>
                        <div style={styles.waitingBadge}>결과 계산 중</div>
                        <h1 style={styles.waitingTitle}>정확한 결과를 계산하고 있어요</h1>
                        <p style={styles.subText}>
                            {resultData.delay_message || "점수 분석이 끝나면 결과가 표시됩니다."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const isDraw = resultData.is_draw;
    const myName = resultData.me.name;
    const opponentName = resultData.opponent.name;
    const winnerName = isDraw ? null : resultData.winner_name;
    const loserName = isDraw ? null : winnerName === myName ? opponentName : myName;

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.topSection}>
                    <div style={styles.resultArena}>
                        <div style={styles.profileColWinner}>
                            <div
                                style={{
                                    ...styles.profileAvatarWinner,
                                    background: isDraw ? "#cbd5e1" : "var(--primary)",
                                    boxShadow: isDraw
                                        ? "0 0 0 4px rgba(203, 213, 225, 0.35)"
                                        : "0 0 20px rgba(20, 184, 166, 0.4), 0 0 0 4px rgba(20, 184, 166, 0.2)",
                                    animation: isDraw ? "none" : "pulse 2s infinite",
                                }}
                            >
                                <User size={40} color="#ffffff" />
                            </div>
                            <span style={styles.profileNameWinner}>
                                {isDraw ? myName : winnerName}
                            </span>
                        </div>

                        <div style={styles.vsBadge}>VS</div>

                        <div style={styles.profileColLoser}>
                            <div style={styles.profileAvatarLoser}>
                                <User size={28} color="#94a3b8" />
                            </div>
                            <span style={styles.profileNameLoser}>
                                {isDraw ? opponentName : loserName}
                            </span>
                        </div>
                    </div>

                    <h1 style={styles.winnerText}>
                        {isDraw ? (
                            <span style={styles.highlightText}>무승부</span>
                        ) : (
                            <>
                                {winnerName}님 <span style={styles.highlightText}>Win!</span>
                            </>
                        )}
                    </h1>
                    <p style={styles.subText}>
                        {isDraw
                            ? "두 사용자의 최종 점수가 같아 무승부로 종료되었어요."
                            : `${winnerName}님이 최종 점수에서 앞서며 승리했어요.`}
                    </p>
                </div>

                {error && <p style={styles.inlineError}>{error}</p>}

                <div style={styles.summaryCard}>
                    <div style={styles.summaryHeader}>
                        <h2 style={styles.summaryTitle}>{categoryMeta?.title || "선택 항목"}</h2>
                        <div style={styles.legendWrapper}>
                            <span style={styles.legendItem}><span style={styles.legendColorMe} />나</span>
                            <span style={styles.legendItem}><span style={styles.legendColorOpponent} />상대</span>
                        </div>
                    </div>

                    <div style={styles.scoreRow}>
                        <div style={styles.barArea}>
                            <div style={styles.barWrapper}>
                                <div
                                    style={{
                                        ...styles.bar,
                                        width: `${getPercent(selectedCategoryScores.opponent, categoryMeta?.maxScore)}%`,
                                        background: "#cbd5e1",
                                    }}
                                />
                            </div>
                            <div style={styles.barWrapper}>
                                <div
                                    style={{
                                        ...styles.bar,
                                        width: `${getPercent(selectedCategoryScores.me, categoryMeta?.maxScore)}%`,
                                        background: "var(--primary)",
                                    }}
                                />
                            </div>
                        </div>
                        <div style={styles.scoreNumbers}>
                            <span style={styles.scoreNumberMe}>{selectedCategoryScores.me}</span>
                            <span style={styles.scoreDivider}>/</span>
                            <span style={styles.scoreNumberOpponent}>{selectedCategoryScores.opponent}</span>
                        </div>
                    </div>

                    <h3 style={styles.sectionSubTitle}>미션 결과</h3>
                    <div style={styles.missionList}>
                        {resultData.missions.map((mission) => (
                            <div key={mission.id} style={styles.missionRow}>
                                <span style={styles.missionTitle}>{mission.title}</span>
                                <div style={styles.missionRight}>
                                    <span
                                        style={{
                                            ...styles.missionWinnerName,
                                            color: getMissionAccentColor(mission, myName),
                                        }}
                                    >
                                        {getMissionStatusText(mission, myName)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>미션 보너스</span>
                        <div style={styles.detailValues}>
                            <span style={styles.scoreNumberMe}>{resultData.me.mission_bonus_score}</span>
                            <span style={styles.scoreDivider}>/</span>
                            <span style={styles.scoreNumberOpponent}>{resultData.opponent.mission_bonus_score}</span>
                        </div>
                    </div>

                    <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>총점</span>
                        <div style={styles.totalNumbers}>
                            <span style={styles.totalScoreMe}>{resultData.me.final_score}</span>
                            <span style={styles.scoreDivider}>/</span>
                            <span style={styles.totalScoreOpponent}>{resultData.opponent.final_score}</span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    style={styles.compareButton}
                    onClick={() => setIsScoreModalOpen(true)}
                >
                    <span style={styles.compareButtonText}>다른 점수도 확인해볼까요? </span>
                    <span style={styles.compareButtonHighlight}>Click!</span>
                </button>

                <div style={styles.bottomArea}>
                    <button
                        style={{
                            ...styles.primaryButton,
                            opacity: isConfirming ? 0.7 : 1,
                            cursor: isConfirming ? "wait" : "pointer",
                        }}
                        onClick={handleReplay}
                        disabled={isConfirming}
                    >
                        {isConfirming ? "이동 중..." : "다시 대결하러가기"}
                    </button>
                </div>
            </div>

            {isScoreModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalPanel}>
                        <button
                            type="button"
                            aria-label="점수 결과 닫기"
                            style={styles.modalCloseButton}
                            onClick={() => setIsScoreModalOpen(false)}
                        >
                            <X size={20} color="var(--text-main)" />
                        </button>

                        <div style={styles.modalCardContent}>
                            <div style={styles.summaryHeader}>
                                <h2 style={styles.summaryTitle}>점수 결과</h2>
                                <div style={styles.legendWrapper}>
                                    <span style={styles.legendItem}><span style={styles.legendColorMe} />나</span>
                                    <span style={styles.legendItem}><span style={styles.legendColorOpponent} />상대</span>
                                </div>
                            </div>

                            <div style={styles.scoreList}>
                                {FULL_SCORE_ROWS.map((row) => {
                                    const myValue = resultData.me.official_score_snapshot?.breakdown?.[row.key] || 0;
                                    const opponentValue = resultData.opponent.official_score_snapshot?.breakdown?.[row.key] || 0;

                                    return (
                                        <div key={row.key} style={styles.scoreRowFull}>
                                            <span style={styles.categoryName}>{row.label}</span>
                                            <div style={styles.barAreaFull}>
                                                <div style={styles.barWrapperSmall}>
                                                    <div
                                                        style={{
                                                            ...styles.bar,
                                                            width: `${getPercent(opponentValue, row.maxScore)}%`,
                                                            background: "#cbd5e1",
                                                        }}
                                                    />
                                                </div>
                                                <div style={styles.barWrapperSmall}>
                                                    <div
                                                        style={{
                                                            ...styles.bar,
                                                            width: `${getPercent(myValue, row.maxScore)}%`,
                                                            background: "var(--primary)",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={styles.scoreNumbersSmall}>
                                                <span style={styles.scoreNumberMe}>{myValue}</span>
                                                <span style={styles.scoreDivider}>/</span>
                                                <span style={styles.scoreNumberOpponent}>{opponentValue}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={styles.totalRow}>
                                <span style={styles.totalLabel}>총점</span>
                                <div style={styles.totalNumbers}>
                                    <span style={styles.totalScoreMe}>{totalScores.me}</span>
                                    <span style={styles.scoreDivider}>/</span>
                                    <span style={styles.totalScoreOpponent}>{totalScores.opponent}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


const styles = {
    container: {
        background: "#f8fafc",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
    },
    content: {
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem",
        paddingTop: "0",
        paddingBottom: "1rem",
    },
    centerMessage: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-sub)",
        fontSize: "1rem",
        fontWeight: "600",
        padding: "2rem",
        textAlign: "center",
    },
    topSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        marginBottom: "2.5rem",
        animation: "fadeInUp 0.6s ease-out forwards",
    },
    waitingBadge: {
        display: "inline-flex",
        alignItems: "center",
        padding: "0.45rem 0.9rem",
        borderRadius: "999px",
        background: "rgba(59, 130, 246, 0.1)",
        color: "#2563eb",
        fontSize: "0.82rem",
        fontWeight: "800",
        marginTop: "1rem",
        marginBottom: "1rem",
    },
    waitingTitle: {
        fontSize: "1.55rem",
        fontWeight: "800",
        color: "var(--text-main)",
        margin: 0,
        marginBottom: "0.75rem",
    },
    resultArena: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        marginBottom: "1.5rem",
        width: "100%",
    },
    vsBadge: {
        color: "var(--text-guide)",
        fontSize: "0.9rem",
        fontWeight: "800",
        letterSpacing: "1px",
        paddingBottom: "24px",
    },
    profileColWinner: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 2,
    },
    profileAvatarWinner: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "0.5rem",
        border: "2px solid white",
    },
    profileNameWinner: {
        fontSize: "1rem",
        fontWeight: "700",
        color: "var(--primary)",
        marginTop: "0.25rem",
    },
    profileColLoser: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: 0.7,
        filter: "grayscale(0.5)",
    },
    profileAvatarLoser: {
        width: "56px",
        height: "56px",
        borderRadius: "20px",
        background: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "0.5rem",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
    },
    profileNameLoser: {
        fontSize: "0.85rem",
        fontWeight: "500",
        color: "var(--text-sub)",
        marginTop: "0.25rem",
    },
    winnerText: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "var(--text-main)",
        lineHeight: 1.4,
        margin: 0,
        marginBottom: "0.5rem",
    },
    highlightText: {
        color: "var(--primary)",
        fontSize: "1.8rem",
        fontWeight: "800",
    },
    subText: {
        fontSize: "0.95rem",
        color: "var(--text-sub)",
        margin: 0,
        lineHeight: 1.55,
    },
    inlineError: {
        margin: "0 0 1rem",
        fontSize: "0.88rem",
        fontWeight: "600",
        color: "#ef4444",
        textAlign: "center",
    },
    summaryCard: {
        background: "white",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        boxShadow: "var(--shadow-md)",
        marginBottom: "2rem",
    },
    compareButton: {
        width: "100%",
        background: "none",
        border: "none",
        padding: 0,
        marginTop: "-0.5rem",
        marginBottom: "1.5rem",
        textAlign: "center",
        cursor: "pointer",
    },
    compareButtonText: {
        fontSize: "0.95rem",
        color: "var(--text-sub)",
    },
    compareButtonHighlight: {
        fontSize: "0.95rem",
        color: "var(--primary)",
        fontWeight: "800",
    },
    summaryHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
    },
    summaryTitle: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "var(--text-main)",
        margin: 0,
    },
    legendWrapper: {
        display: "flex",
        gap: "1rem",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.8rem",
        color: "var(--text-sub)",
    },
    legendColorMe: {
        width: "12px",
        height: "12px",
        borderRadius: "3px",
        background: "var(--primary)",
    },
    legendColorOpponent: {
        width: "12px",
        height: "12px",
        borderRadius: "3px",
        background: "#cbd5e1",
    },
    sectionSubTitle: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "var(--text-main)",
        margin: "0 0 0.75rem 0",
    },
    scoreList: {
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
    },
    scoreRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.5rem",
    },
    scoreRowFull: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    categoryName: {
        width: "30%",
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "var(--text-sub)",
    },
    barArea: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "0 1rem",
    },
    barAreaFull: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "0 1rem",
    },
    barWrapper: {
        height: "6px",
        background: "#f1f5f9",
        borderRadius: "4px",
        overflow: "hidden",
    },
    barWrapperSmall: {
        height: "6px",
        background: "#f1f5f9",
        borderRadius: "4px",
        overflow: "hidden",
    },
    bar: {
        height: "100%",
        borderRadius: "4px",
        transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    scoreNumbers: {
        width: "20%",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "baseline",
        gap: "4px",
        fontSize: "0.9rem",
    },
    scoreNumbersSmall: {
        width: "20%",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "baseline",
        gap: "4px",
        fontSize: "0.9rem",
    },
    scoreNumberMe: {
        color: "var(--primary)",
        fontWeight: "700",
    },
    scoreNumberOpponent: {
        color: "var(--text-guide)",
        fontWeight: "700",
    },
    scoreDivider: {
        color: "var(--text-guide)",
        fontSize: "0.75rem",
        opacity: 0.5,
    },
    missionList: {
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        marginBottom: "1.5rem",
    },
    missionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "0.9rem 1rem",
    },
    missionRight: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexShrink: 0,
    },
    missionTitle: {
        flex: 1,
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "var(--text-main)",
    },
    missionWinnerName: {
        fontSize: "0.8rem",
        fontWeight: "600",
        textAlign: "right",
        flexShrink: 0,
    },
    detailRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    detailLabel: {
        fontSize: "0.92rem",
        fontWeight: "600",
        color: "var(--text-sub)",
    },
    detailValues: {
        display: "flex",
        alignItems: "baseline",
        gap: "6px",
    },
    totalRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "0.5rem",
        paddingTop: "1rem",
        borderTop: "1px dashed #e2e8f0",
    },
    totalLabel: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "var(--text-main)",
    },
    totalNumbers: {
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
    },
    totalScoreMe: {
        fontSize: "1.5rem",
        fontWeight: "800",
        color: "var(--primary)",
    },
    totalScoreOpponent: {
        fontSize: "1.1rem",
        fontWeight: "600",
        color: "var(--text-guide)",
    },
    modalOverlay: {
        position: "fixed",
        inset: 0,
        width: "100%",
        maxWidth: "430px",
        margin: "0 auto",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 1000,
    },
    modalPanel: {
        width: "100%",
        maxWidth: "420px",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "white",
        borderRadius: "24px",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
        position: "relative",
        padding: "3.25rem 1.5rem 1.5rem",
        animation: "fadeInUp 0.25s ease-out forwards",
    },
    modalCloseButton: {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1px solid #e2e8f0",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
    },
    modalCardContent: {
        display: "flex",
        flexDirection: "column",
    },
    bottomArea: {
        marginTop: "1rem",
        marginBottom: "0.5rem",
    },
    primaryButton: {
        width: "100%",
        background: "var(--primary)",
        color: "white",
        border: "none",
        borderRadius: "var(--radius-lg)",
        padding: "1.1rem",
        fontSize: "1rem",
        fontWeight: "700",
        boxShadow: "0 4px 12px rgba(20, 184, 166, 0.25)",
        transition: "all 0.2s ease",
    },
};
