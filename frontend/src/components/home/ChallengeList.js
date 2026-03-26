"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChallengeCard from '@/components/challenge/ChallengeCard';
import { getOngoingChallenges, getMyChallenges } from '@/lib/api/challenge';
import { useAuth } from '@/contexts/AuthContext';

export default function ChallengeList() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchChallenges = async () => {
            // 인증되지 않은 경우 API 호출하지 않음
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }

            try {
                // active + ready 상태 모두 가져오기
                const [activeData, readyData] = await Promise.all([
                    getOngoingChallenges(),
                    getMyChallenges('ready'),
                ]);
                const combined = [...activeData, ...readyData];
                const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
                setChallenges(unique);
            } catch (error) {
                console.error('Failed to fetch challenges:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChallenges();
    }, [isAuthenticated]);

    const handleCardClick = () => {
        router.push('/challenge');
    };

    // 로딩중이 아닌 상태에서 챌린지가 없는 경우
    if (!isLoading && (!isAuthenticated || challenges.length === 0)) {
        return (
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>진행 중인 챌린지</h2>
                </div>
                <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-sub)',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--background-light)',
                    borderRadius: 'var(--radius-md)',
                    margin: '0 0.5rem',
                    border: '1px dashed rgba(0,0,0,0.1)'
                }}>
                    {!isAuthenticated ? (
                        <>
                            로그인하고 챌린지에 도전해보세요!<br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>계정을 만들고 시작해보세요</span>
                        </>
                    ) : (
                        <>
                            진행 중인 챌린지가 없습니다.<br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>새로운 챌린지에 도전해보세요!</span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>진행 중인 챌린지</h2>
            </div>

            <div style={{ position: 'relative', margin: '0 -0.5rem' }}>
                {/* Left Blur */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '20px',
                    background: 'linear-gradient(to right, var(--background-light) 20%, transparent)',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}></div>

                {/* Right Blur */}
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '20px',
                    background: 'linear-gradient(to left, var(--background-light) 20%, transparent)',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}></div>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    overflowX: 'auto',
                    padding: '0.25rem 1rem',
                    scrollbarWidth: 'none',
                    paddingBottom: '0.25rem',
                    maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                }}>
                    {challenges.map(challenge => (
                        <div key={challenge.uniqueId || challenge.id} style={{ minWidth: '310px' }}>
                            <ChallengeCard
                                challenge={challenge}
                                onClick={handleCardClick}
                                isOngoing={true}
                            />
                        </div>
                    ))}

                    {/* Loading Skeletons if loading */}
                    {isLoading && (
                        <>
                            <div style={{ minWidth: '310px', height: '140px', backgroundColor: 'white', borderRadius: '16px', opacity: 0.5 }}></div>
                            <div style={{ minWidth: '310px', height: '140px', backgroundColor: 'white', borderRadius: '16px', opacity: 0.5 }}></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
