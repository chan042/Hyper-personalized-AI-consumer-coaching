"use client";

import { useState, useEffect } from 'react';
import { getCategoryStats } from '@/lib/api/transaction';

// 카테고리별 색상 매핑
const CATEGORY_COLORS = {
    '식비': '#14b8a6',
    '쇼핑': '#f59e0b',
    '교통': '#8b5cf6',
    '여가': '#ec4899',
    '주거': '#3b82f6',
    '의료': '#ef4444',
    '교육': '#10b981',
    '통신': '#6366f1',
    '생활': '#06b6d4',
    '기타': '#9ca3af',
};

// 기본 색상 팔레트 (카테고리가 많을 경우 사용)
const DEFAULT_COLORS = [
    '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899',
    '#3b82f6', '#ef4444', '#10b981', '#6366f1',
    '#f97316', '#06b6d4', '#84cc16', '#d946ef'
];

export default function CategorySpending() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null); // 선택된 카테고리

    useEffect(() => {
        fetchCategoryStats();
    }, []);

    const fetchCategoryStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getCategoryStats();

            // 카테고리별 색상 지정
            const categoriesWithColors = response.categories.map((cat, index) => ({
                name: cat.category,
                amount: cat.amount,
                percent: cat.percent,
                color: CATEGORY_COLORS[cat.category] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            }));

            setData(categoriesWithColors);
            setTotal(response.total);
            // 기본값으로 가장 큰 비율의 카테고리 선택
            if (categoriesWithColors.length > 0) {
                setSelectedCategory(categoriesWithColors[0]);
            }
        } catch (err) {
            console.error('Failed to fetch category stats:', err);
            setError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // SVG 좌표 계산
    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    // 카테고리 클릭 핸들러
    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    if (loading) {
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '2.5rem',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2rem' }}>카테고리별 소비</h2>
                <p style={{ color: 'var(--text-sub)', padding: '3rem 0' }}>데이터를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '2.5rem',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2rem' }}>카테고리별 소비</h2>
                <p style={{ color: '#ef4444', padding: '3rem 0' }}>{error}</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '2.5rem',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2rem' }}>카테고리별 소비</h2>
                <p style={{ color: 'var(--text-sub)', padding: '3rem 0' }}>아직 지출 내역이 없습니다.</p>
            </div>
        );
    }

    let cumulativePercent = 0;

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem 1.5rem',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '2.5rem'
        }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2rem' }}>카테고리별 소비</h2>

            {/* Donut Chart */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem', position: 'relative' }}>
                <svg viewBox="-1.5 -1.5 3 3" style={{ transform: 'rotate(-90deg)', width: '200px', height: '200px' }}>
                    {data.map((slice, index) => {
                        const start = cumulativePercent;
                        cumulativePercent += slice.percent / 100;
                        const end = cumulativePercent;

                        const [startX, startY] = getCoordinatesForPercent(start);
                        const [endX, endY] = getCoordinatesForPercent(end);

                        const largeArcFlag = slice.percent > 50 ? 1 : 0;

                        const pathData = [
                            `M ${startX} ${startY}`,
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            `L 0 0`,
                        ].join(' ');

                        // 선택된 카테고리인지 확인
                        const isSelected = selectedCategory && selectedCategory.name === slice.name;

                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={slice.color}
                                stroke="white"
                                strokeWidth="0.08"
                                style={{
                                    cursor: 'pointer',
                                    opacity: isSelected ? 1 : 0.85,
                                    transition: 'opacity 0.2s ease'
                                }}
                                onClick={() => handleCategoryClick(slice)}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = isSelected ? '1' : '0.85'}
                            />
                        );
                    })}
                    {/* Center Hole for Donut Effect */}
                    <circle cx="0" cy="0" r="0.7" fill="white" />
                </svg>
            </div>

            {/* Selected Category Info */}
            {
                selectedCategory && (
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#f7fafc',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: selectedCategory.color
                            }}></div>
                            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                {selectedCategory.name}
                            </span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                                ₩{selectedCategory.amount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                )
            }

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => handleCategoryClick(item)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem',
                            borderBottom: index < data.length - 1 ? '1px solid #f7fafc' : 'none',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: selectedCategory && selectedCategory.name === item.name ? '#f0f9ff' : 'transparent',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!selectedCategory || selectedCategory.name !== item.name) {
                                e.currentTarget.style.backgroundColor = '#f7fafc';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!selectedCategory || selectedCategory.name !== item.name) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color }}></div>
                            <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '500' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: '500' }}>
                                {item.percent.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                ₩{item.amount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}
