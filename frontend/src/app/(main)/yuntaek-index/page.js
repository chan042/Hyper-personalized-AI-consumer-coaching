"use client";

import { useRouter } from 'next/navigation';
import { useYuntaekScore, useYuntaekReport } from '@/hooks/useYuntaekData';
import YuntaekScoreCard from '@/components/yuntaek/YuntaekScoreCard';
import ReportSummary from '@/components/yuntaek/ReportSummary';
import LoadingOverlay from '@/components/common/LoadingOverlay';

export default function YuntaekIndexPage() {
    const router = useRouter();
    const { score, details, scoreData, isNewUser: scoreNewUser, loading: scoreLoading, error: scoreError } = useYuntaekScore();
    const { reportSummary, isNewUser: reportNewUser, loading: reportLoading, error: reportError } = useYuntaekReport();

    const loading = scoreLoading || reportLoading;
    const error = scoreError || reportError;
    const isNewUser = scoreNewUser || reportNewUser;

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <p style={{ color: '#ef4444' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="yuntaek-page-container">
            {loading && <LoadingOverlay message="AI가 소비 내역을 분석하고 있습니다..." />}

            <YuntaekScoreCard
                score={score}
                year={scoreData?.year}
                month={scoreData?.month}
                isNewUser={isNewUser}
                details={details}
            />

            <ReportSummary
                summary={reportSummary}
                year={scoreData?.year}
                month={scoreData?.month}
                isNewUser={isNewUser}
                onViewMore={() => router.push('/yuntaek-index/report')}
            />
        </div>
    );
}
