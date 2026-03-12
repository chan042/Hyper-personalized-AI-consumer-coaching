"use client";

import { useState, useEffect, useCallback } from 'react';
import { getYuntaekScore, getYuntaekReport } from '@/lib/api/yuntaek';

const SCORE_DETAILS_MAP = [
    { key: 'budget_achievement', label: '예산 달성률', max: 35 },
    { key: 'alternative_action', label: '대체 행동 실현', max: 20 },
    { key: 'growth_consumption', label: '성장 점수', max: 10 },
    { key: 'health_score', label: '건강 점수', max: 15 },
    { key: 'spending_consistency', label: '꾸준함', max: 7 },
    { key: 'leakage_improvement', label: '누수 지출', max: 10 },
    { key: 'challenge_success', label: '챌린지 참여', max: 3 },
];

// ─── 공통 헬퍼 함수 ───

/** 조회 대상 연/월 (전월) 계산 */
function getTargetYearMonth() {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const currentYear = Number(parts.find((part) => part.type === 'year')?.value);
    const currentMonth = Number(parts.find((part) => part.type === 'month')?.value);

    if (currentMonth === 1) {
        return { year: currentYear - 1, month: 12 };
    }

    return { year: currentYear, month: currentMonth - 1 };
}

// ─── localStorage 캐싱 ───

function getCacheKey(type, year, month) {
    return `yuntaek_${type}_${year}_${month}`;
}

function getFromCache(type, year, month) {
    if (typeof window === 'undefined') return null;

    try {
        const key = getCacheKey(type, year, month);
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (data.year === year && data.month === month) {
            return data;
        }
        return null;
    } catch (err) {
        console.error('캐시 읽기 오류:', err);
        return null;
    }
}

function saveToCache(type, data) {
    if (typeof window === 'undefined') return;

    try {
        const { year, month } = data;
        const key = getCacheKey(type, year, month);
        localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
        console.error('캐시 저장 오류:', err);
    }
}

// ─── 리포트 데이터 처리 (중복 제거) ───

function extractSummary(reportData) {
    if (!reportData) return '요약 정보를 불러올 수 없습니다.';
    if (typeof reportData === 'object' && reportData.summary) {
        return reportData.summary.overview || '요약 정보를 불러올 수 없습니다.';
    }
    return '요약 정보를 불러올 수 없습니다.';
}

/** 리포트 응답에서 isNewUser, reportSummary를 추출 */
function processReportResponse(data) {
    if (data.is_new_user) {
        return { isNewUser: true, reportSummary: '' };
    }
    return { isNewUser: false, reportSummary: extractSummary(data.report) };
}

// ─── Hooks ───

export function useYuntaekScore() {
    const [scoreData, setScoreData] = useState(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fromCache, setFromCache] = useState(false);

    useEffect(() => {
        const fetchScore = async () => {
            let cached = null;
            try {
                const { year, month } = getTargetYearMonth();
                cached = getFromCache('score', year, month);

                if (cached) {
                    if (cached.is_new_user) {
                        setIsNewUser(true);
                        setScoreData(null);
                    } else {
                        setScoreData(cached);
                    }
                    setFromCache(true);
                    setLoading(false);
                }

                const data = await getYuntaekScore(year, month);

                if (data.is_new_user) {
                    setIsNewUser(true);
                    setScoreData(null);
                } else {
                    setScoreData(data);
                }

                saveToCache('score', data);
                setFromCache(false);
                setError(null);
            } catch (err) {
                console.error('윤택지수 로딩 오류:', err);
                if (!cached) {
                    setError(err.response?.data?.error || err.message || '윤택지수를 불러오는데 실패했습니다.');
                }
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

    return { scoreData, score, details, isNewUser, loading, error, fromCache };
}

export function useYuntaekReport() {
    const [reportData, setReportData] = useState(null);
    const [reportSummary, setReportSummary] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fromCache, setFromCache] = useState(false);

    const applyReportData = useCallback((data) => {
        setReportData(data);
        const processed = processReportResponse(data);
        setIsNewUser(processed.isNewUser);
        setReportSummary(processed.reportSummary);
    }, []);

    useEffect(() => {
        const fetchReport = async () => {
            let cached = null;
            try {
                const { year, month } = getTargetYearMonth();
                cached = getFromCache('report', year, month);

                if (cached) {
                    applyReportData(cached);
                    setFromCache(true);
                    setLoading(false);
                }

                const data = await getYuntaekReport(year, month);
                applyReportData(data);

                saveToCache('report', data);
                setFromCache(false);
                setError(null);
            } catch (err) {
                console.error('리포트 로딩 오류:', err);
                if (!cached) {
                    setError(err.response?.data?.error || err.message || '리포트를 불러오는데 실패했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [applyReportData]);

    return { reportData, reportSummary, isNewUser, loading, error, fromCache };
}
