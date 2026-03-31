"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const PROVIDER_LABELS = {
    kakao: '카카오',
};

function getErrorMessage(error, providerLabel) {
    if (error?.response?.data?.error) {
        return error.response.data.error;
    }

    if (error?.message) {
        return error.message;
    }

    return `${providerLabel} 로그인 처리 중 오류가 발생했습니다.`;
}

export default function SocialLoginCallbackPage({ provider }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loginWithKakao } = useAuth();

    const providerLabel = PROVIDER_LABELS[provider] ?? provider;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const providerError = searchParams.get('error');
    const providerErrorDescription = searchParams.get('error_description');

    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const finishWithError = (message) => {
            if (!isMounted) {
                return;
            }

            setErrorMessage(message);
            setStatus('error');
        };

        const handleCallback = async () => {
            if (provider !== 'kakao') {
                finishWithError('지원하지 않는 로그인 방식입니다.');
                return;
            }

            if (providerError) {
                finishWithError(
                    providerErrorDescription
                        ? decodeURIComponent(providerErrorDescription)
                        : `${providerLabel} 로그인이 취소되었거나 권한 동의가 완료되지 않았습니다.`,
                );
                return;
            }

            if (!code) {
                finishWithError('인가 코드가 없습니다. 다시 로그인해주세요.');
                return;
            }

            if (typeof window === 'undefined') {
                finishWithError('브라우저 환경을 확인할 수 없습니다.');
                return;
            }

            const stateStorageKey = `oauth_state_${provider}`;
            const storedState = sessionStorage.getItem(stateStorageKey);
            sessionStorage.removeItem(stateStorageKey);

            if (!state || !storedState || state !== storedState) {
                finishWithError('로그인 상태 검증에 실패했습니다. 다시 시도해주세요.');
                return;
            }

            try {
                const redirectUri = `${window.location.origin}/login/callback/${provider}`;
                await loginWithKakao({
                    code,
                    state,
                    redirect_uri: redirectUri,
                });

                if (isMounted) {
                    setStatus('success');
                }
            } catch (error) {
                finishWithError(getErrorMessage(error, providerLabel));
            }
        };

        handleCallback();

        return () => {
            isMounted = false;
        };
    }, [
        code,
        loginWithKakao,
        provider,
        providerError,
        providerErrorDescription,
        providerLabel,
        state,
    ]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <p style={styles.badge}>{providerLabel} 로그인</p>
                <h1 style={styles.title}>
                    {status === 'error' ? '로그인을 완료하지 못했습니다' : '로그인 처리 중입니다'}
                </h1>
                <p style={styles.description}>
                    {status === 'error'
                        ? errorMessage
                        : '인증 정보를 확인하고 Duduk 계정에 연결하고 있습니다.'}
                </p>

                {status !== 'error' && <div style={styles.loader} />}

                {status === 'error' && (
                    <button type="button" style={styles.button} onClick={() => router.push('/login')}>
                        로그인 화면으로 돌아가기
                    </button>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background:
            'radial-gradient(circle at top, rgba(254, 229, 0, 0.18), transparent 35%), #F8FAFC',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        borderRadius: '24px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
        textAlign: 'center',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem 0.75rem',
        borderRadius: '999px',
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        fontSize: '0.875rem',
        fontWeight: '700',
        marginBottom: '1rem',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: '0.75rem',
    },
    description: {
        color: '#475569',
        lineHeight: 1.7,
        marginBottom: '1.5rem',
        whiteSpace: 'pre-wrap',
    },
    loader: {
        width: '2.5rem',
        height: '2.5rem',
        margin: '0 auto',
        borderRadius: '999px',
        border: '4px solid rgba(15, 23, 42, 0.08)',
        borderTopColor: '#F59E0B',
        animation: 'spin 0.8s linear infinite',
    },
    button: {
        width: '100%',
        minHeight: '3rem',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: '#111827',
        color: '#FFFFFF',
        fontWeight: '700',
        cursor: 'pointer',
    },
};
