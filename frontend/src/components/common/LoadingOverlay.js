"use client";

import { Sparkles } from 'lucide-react';

export default function LoadingOverlay({
    message = '로딩 중입니다...',
    helperText = '잠시만 기다려주세요.',
    showBadge = true,
}) {
    return (
        <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="loading-shell">
                <div className="loading-backdrop-orb loading-backdrop-orb-left" />
                <div className="loading-backdrop-orb loading-backdrop-orb-right" />

                <div className="loading-card">
                    {showBadge && (
                        <div className="loading-badge">
                            <Sparkles size={14} strokeWidth={2.2} />
                            <span>두둑 AI</span>
                        </div>
                    )}

                    <div className="loading-copy">
                        <p className="loading-title">{message}</p>
                        <p className="loading-helper">{helperText}</p>
                    </div>

                    <div className="loading-progress-track" aria-hidden="true">
                        <div className="loading-progress-fill" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                .loading-shell {
                    position: relative;
                    width: min(100%, 340px);
                    padding: 0 1.25rem;
                }

                .loading-backdrop-orb {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(24px);
                    opacity: 0.7;
                    pointer-events: none;
                }

                .loading-backdrop-orb-left {
                    width: 120px;
                    height: 120px;
                    top: -26px;
                    left: 4px;
                    background: rgba(94, 234, 212, 0.28);
                }

                .loading-backdrop-orb-right {
                    width: 100px;
                    height: 100px;
                    right: 12px;
                    bottom: -16px;
                    background: rgba(245, 158, 11, 0.14);
                }

                .loading-card {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1.35rem 1.25rem 1.2rem;
                    border-radius: 28px;
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98));
                    border: 1px solid rgba(255, 255, 255, 0.95);
                    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
                    overflow: hidden;
                }

                .loading-card::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(255, 255, 255, 0));
                    pointer-events: none;
                }

                .loading-badge {
                    position: relative;
                    z-index: 1;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    width: fit-content;
                    padding: 0.45rem 0.7rem;
                    border-radius: 999px;
                    background: rgba(20, 184, 166, 0.12);
                    color: var(--primary-dark);
                    font-size: 0.8rem;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                }

                .loading-copy {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }

                .loading-title {
                    margin: 0;
                    color: var(--text-main);
                    font-size: 1rem;
                    font-weight: 700;
                    line-height: 1.5;
                    letter-spacing: -0.02em;
                    word-break: keep-all;
                }

                .loading-helper {
                    margin: 0;
                    color: var(--text-sub);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    word-break: keep-all;
                }

                .loading-progress-track {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    height: 10px;
                    overflow: hidden;
                    border-radius: 999px;
                    background: rgba(20, 184, 166, 0.12);
                }

                .loading-progress-fill {
                    position: absolute;
                    inset: 0;
                    width: 42%;
                    border-radius: inherit;
                    background: linear-gradient(90deg, var(--primary-light), var(--primary), var(--primary-dark));
                    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.28);
                    animation: duduk-loading-slide 1.3s ease-in-out infinite;
                }

                @keyframes duduk-loading-slide {
                    0% {
                        transform: translateX(-110%);
                    }

                    60% {
                        transform: translateX(140%);
                    }

                    100% {
                        transform: translateX(220%);
                    }
                }
            `}</style>
        </div>
    );
}
