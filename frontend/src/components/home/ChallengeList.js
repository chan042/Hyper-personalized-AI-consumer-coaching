"use client";

import { Coffee, Utensils, ChevronRight } from 'lucide-react';

export default function ChallengeList() {
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>도전 중인 챌린지</h2>
                <button style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--text-sub)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    더보기 <ChevronRight size={14} />
                </button>
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
                    paddingBottom: '1rem',
                    maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                }}>
                    {/* Card 1 */}
                    <div style={{
                        minWidth: '220px',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer',
                        border: '1px solid rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--primary)',
                                    fontWeight: '700',
                                    display: 'inline-block',
                                    marginBottom: '0.25rem',
                                    backgroundColor: '#ccfbf1',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '8px'
                                }}>
                                    진행 중
                                </span>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>커피값 아끼기</h3>
                            </div>
                            <div style={{
                                backgroundColor: '#f0fdfa',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)'
                            }}>
                                <Coffee size={18} color="var(--primary)" strokeWidth={2} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>₩35,000</span>
                            <span style={{ color: 'var(--text-sub)' }}>/ ₩70,000</span>
                        </div>

                        <div style={{ width: '100%', height: '6px', backgroundColor: '#edf2f7', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                            <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>목표: 30일 중 15일 달성</p>
                    </div>

                    {/* Card 2 */}
                    <div style={{
                        minWidth: '220px',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer',
                        border: '1px solid rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--primary)',
                                    fontWeight: '700',
                                    display: 'inline-block',
                                    marginBottom: '0.25rem',
                                    backgroundColor: '#ccfbf1',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '8px'
                                }}>
                                    진행 중
                                </span>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>배달음식 줄이기</h3>
                            </div>
                            <div style={{
                                backgroundColor: '#f0fdfa',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)'
                            }}>
                                <Utensils size={18} color="var(--primary)" strokeWidth={2} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>₩45,000</span>
                            <span style={{ color: 'var(--text-sub)' }}>/ ₩150,000</span>
                        </div>

                        <div style={{ width: '100%', height: '6px', backgroundColor: '#edf2f7', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                            <div style={{ width: '30%', height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>목표: 4회 중 2회 이용</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
