"use client";

/**
 * [파일 역할]
 * - 회원가입 페이지 UI를 구현합니다.
 * - 이메일, 비밀번호, 이름 입력 폼을 제공합니다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api/auth';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        passwordConfirm: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 비밀번호 확인
        if (formData.password !== formData.passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // 비밀번호 길이 확인
        if (formData.password.length < 8) {
            setError('비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        setLoading(true);

        try {
            await register(
                formData.email,
                formData.username,
                formData.password,
                formData.passwordConfirm
            );

            // 성공 시 로그인 페이지로 이동
            router.push('/login?registered=true');
        } catch (err) {
            console.error('회원가입 실패:', err);
            if (err.response?.data) {
                // 백엔드 에러 메시지 처리
                const errorData = err.response.data;
                if (errorData.email) {
                    setError(`이메일: ${errorData.email[0]}`);
                } else if (errorData.username) {
                    setError(`사용자명: ${errorData.username[0]}`);
                } else if (errorData.password) {
                    setError(`비밀번호: ${errorData.password[0]}`);
                } else {
                    setError('회원가입에 실패했습니다. 다시 시도해주세요.');
                }
            } else {
                setError('회원가입에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <h1 style={styles.title}>Duduk</h1>

            {/* 회원가입 폼 */}
            <form onSubmit={handleSubmit} style={styles.form}>
                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="이메일"
                    required
                    style={styles.input}
                />

                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="이름 (닉네임)"
                    required
                    style={styles.input}
                />

                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="비밀번호 (8자 이상)"
                    required
                    style={styles.input}
                />

                <input
                    type="password"
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    placeholder="비밀번호 확인"
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
                    {loading ? '가입 중...' : '가입하기'}
                </button>
            </form>

            {/* 로그인 링크 */}
            <div style={styles.footer}>
                <button
                    onClick={() => window.location.href = '/login'}
                    style={styles.loginButton}
                >
                    로그인
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
    loginButton: {
        background: 'none',
        border: 'none',
        color: 'var(--text-sub)',
        fontSize: '0.95rem',
        cursor: 'pointer',
        padding: '0.5rem',
        transition: 'color 0.2s ease',
    },
};
