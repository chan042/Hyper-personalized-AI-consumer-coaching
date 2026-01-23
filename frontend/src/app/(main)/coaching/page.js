"use client";

import { useState, useEffect } from 'react';
import SavingsSummary from '@/components/coaching/SavingsSummary';
import CoachingCardList from '@/components/coaching/CoachingCardList';
import CompletedCoachingList from '@/components/coaching/CompletedCoachingList';
import { getCoachingAdvice } from '@/lib/api/coaching';
import { ShoppingBag, MapPin, Droplets, Zap, Lightbulb } from 'lucide-react';

export default function CoachingPage() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    const getIconForSubject = (subject) => {
        switch (subject) {
            case "행동 변화 제안": return <Zap size={20} color="#2f855a" />;
            case "누수 소비": return <Droplets size={20} color="#2f855a" />;
            case "위치 기반 대안": return <MapPin size={20} color="#2f855a" />;
            case "키워드 기반 대안": return <ShoppingBag size={20} color="#2f855a" />;
            default: return <Lightbulb size={20} color="#2f855a" />;
        }
    };

    useEffect(() => {
        const fetchCoaching = async () => {
            try {
                const data = await getCoachingAdvice();
                // Map backend data to frontend format
                const mappedCards = data.map(item => ({
                    id: item.id,
                    tag: item.subject,
                    title: item.title,
                    analysis: item.analysis,
                    description: item.coaching_content,
                    estimated_savings: item.estimated_savings, // 추가된 필드 저장
                    icon: getIconForSubject(item.subject)
                }));
                setCards(mappedCards);
            } catch (error) {
                console.error("Failed to fetch coaching:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCoaching();
    }, []);

    // 예상 절약액 합계 계산
    const totalSavings = cards.reduce((sum, card) => sum + (card.estimated_savings || 0), 0);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--background-light)',
            paddingBottom: '6rem'
        }}>

            <main>
                {/* 계산된 합계를 전달 */}
                <SavingsSummary totalSavings={totalSavings} />
                {/* 매핑된 카드 데이터 전달 */}
                <CoachingCardList cards={cards} loading={loading} />
                <CompletedCoachingList />
            </main>
        </div >
    );
}
