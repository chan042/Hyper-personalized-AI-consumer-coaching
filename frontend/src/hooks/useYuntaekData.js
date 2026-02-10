"use client";

import { useState, useEffect } from 'react';
import { getYuntaekScore, getYuntaekReport } from '@/lib/api/yuntaek';

const SCORE_DETAILS_MAP = [
    { key: 'budget_achievement', label: '예산 달성률', max: 35 },
    { key: 'alternative_action', label: '대체 행동 실현', max: 20 },
    { key: 'growth_consumption', label: '성장 점수', max: 10 },
    { key: 'health_score', label: '건강 점수', max: 15 },
    { key: 'spending_consistency', label: '꾸준함', max: 7 },
    { key: 'leakage_improvement', label: '누수지출 개선', max: 10 },
    { key: 'challenge_success', label: '챌린지 참여', max: 3 },
];

function extractSummary(reportData) {
    if (!reportData) return '요약 정보를 불러올 수 없습니다.';
    if (typeof reportData === 'object' && reportData.summary) {
        return reportData.summary.overview || '요약 정보를 불러올 수 없습니다.';
    }
    return '요약 정보를 불러올 수 없습니다.';
}

function buildGuideText(guide) {
    return `${guide.title}\n\n${guide.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n💡 팁:\n${guide.tips.map(t => `• ${t}`).join('\n')}`;
}

export function useYuntaekScore() {
    const [scoreData, setScoreData] = useState(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchScore = async () => {
            try {
                const data = await getYuntaekScore();

                if (data.is_new_user) {
                    setIsNewUser(true);
                    setScoreData(null);
                } else {
                    setScoreData(data);
                }
            } catch (err) {
                console.error('윤택지수 로딩 오류:', err);
                setError(err.response?.data?.error || err.message || '윤택지수를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchScore();
    }, []);

    const score = scoreData?.total_score || 0;

    const details = scoreData
        ? SCORE_DETAILS_MAP.map(({ key, label, max }) => ({
            label,
            score: scoreData.breakdown?.[key] || 0,
            max,
        }))
        : [];

    return { scoreData, score, details, isNewUser, loading, error };
}

export function useYuntaekReport() {
    const [reportData, setReportData] = useState(null);
    const [reportSummary, setReportSummary] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const data = await getYuntaekReport();
                setReportData(data);

                if (data.is_new_user) {
                    setIsNewUser(true);

                    if (data.report?.guide) {
                        setReportSummary(buildGuideText(data.report.guide));
                    } else if (data.report?.summary) {
                        setReportSummary(data.report.summary.overview);
                    } else {
                        setReportSummary('리포트를 불러올 수 없습니다.');
                    }
                } else {
                    setReportSummary(extractSummary(data.report));
                }
            } catch (err) {
                console.error('리포트 로딩 오류:', err);
                setError(err.response?.data?.error || err.message || '리포트를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, []);

    return { reportData, reportSummary, isNewUser, loading, error };
}
