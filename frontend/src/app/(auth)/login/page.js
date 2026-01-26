"use client";

/**
 * [파일 역할]
 * - 로그인 페이지 UI를 구현합니다.
 * - 이메일/비밀번호 입력 폼과 회원가입 링크를 제공합니다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login: handleAuthLogin } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { access, refresh } = await login(email, password);
            await handleAuthLogin(access, refresh);
            // AuthContext에서 리다이렉트 처리
        } catch (err) {
            console.error('로그인 실패:', err);
            if (err.response?.status === 401) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else {
                setError('로그인에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <h1 style={styles.title}>Duduk</h1>

            {/* 로그인 폼 */}
            <form onSubmit={handleSubmit} style={styles.form}>
                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일"
                    required
                    style={styles.input}
                />

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    required
                    style={styles.input}
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        ...styles.submitButton,
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? '로그인 중...' : '로그인'}
                </button>
            </form>

            {/* 회원가입 링크 */}
            <div style={styles.footer}>
                <button
                    onClick={() => window.location.href = '/signup'}
                    style={styles.signupButton}
                >
                    회원가입
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '400px',
        margin: '0 auto',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '3rem',
        textAlign: 'left',
        width: '100%',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        color: '#DC2626',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        textAlign: 'center',
        marginBottom: '0.5rem',
    },
    input: {
        width: '100%',
        padding: '1rem',
        fontSize: '1rem',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#FFFFFF',
        transition: 'all 0.2s ease',
        outline: 'none',
    },
    submitButton: {
        width: '100%',
        padding: '1rem',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        marginTop: '0.5rem',
        boxShadow: '0 4px 12px rgba(47, 133, 90, 0.25)',
        cursor: 'pointer',
    },
    footer: {
        marginTop: '1.5rem',
        width: '100%',
        textAlign: 'center',
    },
    signupButton: {
        background: 'none',
        border: 'none',
        color: 'var(--text-sub)',
        fontSize: '0.95rem',
        cursor: 'pointer',
        padding: '0.5rem',
        transition: 'color 0.2s ease',
    },
};
