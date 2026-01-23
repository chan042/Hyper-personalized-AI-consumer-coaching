import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coffee, ShoppingBag, Bus, Film, Utensils, ChevronRight, HelpCircle } from 'lucide-react';
import { getTransactions } from '../../lib/api/transaction';

export default function RecentTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const data = await getTransactions();
                setTransactions(data.transactions);
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    // 카테고리별 아이콘 매핑
    const getIcon = (category) => {
        switch (category) {
            case '식비': return Coffee;
            case '생활': return Utensils;
            case '카페/간식': return ShoppingBag;
            case '온라인 쇼핑': return Bus;
            case '패션/쇼핑': return Film;
            case '뷰티/미용': return Coffee;
            case '교통': return Utensils;
            case '자동차': return ShoppingBag;
            case '주거/통신': return Bus;
            case '의료/건강': return Film;
            case '문화/여가': return Coffee;
            case '여행/숙박': return Utensils;
            case '교육': return ShoppingBag;
            case '육아': return Bus;
            case '반려동물': return Film;
            case '경조/선물': return Bus;
            case '술/유흥': return Film;
            case '기타': return HelpCircle;
            default: return HelpCircle; // 기본 아이콘
        }
    };

    // 날짜 포맷팅 (예: 2024-11-30 -> 11월 30일)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    if (isLoading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>최근 내역</h2>
                <Link
                    href="/expense?view=list"
                    style={{
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        color: 'var(--text-sub)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}
                >
                    더보기 <ChevronRight size={16} />
                </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!Array.isArray(transactions) || transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-sub)' }}>
                        아직 지출 내역이 없습니다.
                    </div>
                ) : (
                    transactions.map((t) => {
                        const Icon = getIcon(t.category);
                        return (
                            <div key={t.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'white',
                                padding: '1.25rem',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'transform 0.1s ease',
                                cursor: 'pointer'
                            }}>
                                <div style={{
                                    backgroundColor: '#ccfbf1',
                                    padding: '0.85rem',
                                    borderRadius: '50%',
                                    marginRight: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon size={22} color="#14b8a6" strokeWidth={2} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                        {t.store || t.item || '알 수 없음'}
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: '500' }}>
                                        {formatDate(t.date)} | {t.category}
                                    </p>
                                </div>

                                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                    {t.amount.toLocaleString()}원
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
