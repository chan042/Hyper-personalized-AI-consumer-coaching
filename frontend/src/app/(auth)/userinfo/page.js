"use client";

/**
 * [파일 역할]
 * - 최초 회원가입 사용자를 위한 정보 수집 온보딩 페이지입니다.
 * - 질문-답변 형식으로 6가지 정보를 순차적으로 수집합니다.
 * - 완료 후 메인 페이지로 이동합니다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

// 질문 목록
const questions = [
    {
        id: 'age',
        question: '나이가 어떻게 되시나요?',
        placeholder: '예: 28',
        type: 'number'
    },
    {
        id: 'job',
        question: '어떤 일을 하고 계신가요?',
        placeholder: '예: 프리랜서 개발자',
        type: 'text'
    },
    {
        id: 'hobbies',
        question: '취미가 무엇인가요?',
        placeholder: '예: 독서, 영화 감상, 요리',
        type: 'text'
    },
    {
        id: 'marital_status',
        question: '결혼 여부를 알려주세요.',
        options: [
            { value: 'SINGLE', label: '미혼' },
            { value: 'MARRIED', label: '기혼' }
        ],
        type: 'select'
    },
    {
        id: 'monthly_budget',
        question: '한 달 예산은 얼마인가요?',
        placeholder: '예: 2000000',
        suffix: '원',
        type: 'number'
    },
    {
        id: 'spending_to_improve',
        question: '개선하고 싶은 소비 습관이 있나요?',
        placeholder: '예: 외식비, 배달 음식, 충동구매',
        type: 'text'
    }
];

export default function UserInfoPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { refreshUser } = useAuth();

    const currentQuestion = questions[currentStep];
    const isLastQuestion = currentStep === questions.length - 1;

    // 답변 제출 처리
    const handleSubmit = async () => {
        // 현재 답변 저장
        const newAnswers = {
            ...answers,
            [currentQuestion.id]: currentQuestion.type === 'number'
                ? Number(inputValue)
                : inputValue
        };
        setAnswers(newAnswers);
        setInputValue('');

        if (isLastQuestion) {
            // 마지막 질문이면 API 호출
            setLoading(true);
            setError('');
            try {
                await updateProfile({
                    ...newAnswers,
                    is_profile_complete: true
                });
                await refreshUser();
                router.push('/');
            } catch (err) {
                console.error('프로필 저장 실패:', err);
                setError('저장에 실패했습니다. 다시 시도해주세요.');
                setLoading(false);
            }
        } else {
            // 다음 질문으로 이동
            setCurrentStep(prev => prev + 1);
        }
    };

    // 선택형 답변 처리
    const handleSelect = (value) => {
        const newAnswers = {
            ...answers,
            [currentQuestion.id]: value
        };
        setAnswers(newAnswers);

        if (isLastQuestion) {
            setLoading(true);
            updateProfile({
                ...newAnswers,
                is_profile_complete: true
            }).then(() => {
                refreshUser();
                router.push('/');
            }).catch(err => {
                console.error('프로필 저장 실패:', err);
                setError('저장에 실패했습니다. 다시 시도해주세요.');
                setLoading(false);
            });
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    // Enter 키 처리
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            handleSubmit();
        }
    };

    return (
        <div style={styles.container}>
            {/* 상단 타이틀 */}
            <h1 style={styles.title}>Duduk</h1>

            {/* 진행 상태 */}
            <div style={styles.progress}>
                <div style={styles.progressBar}>
                    <div
                        style={{
                            ...styles.progressFill,
                            width: `${((currentStep + 1) / questions.length) * 100}%`
                        }}
                    />
                </div>
                <span style={styles.progressText}>
                    {currentStep + 1} / {questions.length}
                </span>
            </div>

            {/* 질문 */}
            <div style={styles.questionContainer}>
                <h2 style={styles.question}>{currentQuestion.question}</h2>

                {error && (
                    <div style={styles.errorBox}>{error}</div>
                )}

                {/* 입력 타입에 따른 UI */}
                {currentQuestion.type === 'select' ? (
                    <div style={styles.optionsContainer}>
                        {currentQuestion.options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                style={styles.optionButton}
                                disabled={loading}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={styles.inputContainer}>
                        <input
                            type={currentQuestion.type}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={currentQuestion.placeholder}
                            style={styles.input}
                            autoFocus
                            disabled={loading}
                        />
                        {currentQuestion.suffix && (
                            <span style={styles.suffix}>{currentQuestion.suffix}</span>
                        )}
                    </div>
                )}
            </div>

            {/* 다음 버튼 (텍스트/숫자 입력용) */}
            {currentQuestion.type !== 'select' && (
                <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || loading}
                    style={{
                        ...styles.nextButton,
                        opacity: !inputValue.trim() || loading ? 0.5 : 1,
                        cursor: !inputValue.trim() || loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? '저장 중...' : isLastQuestion ? '완료' : '다음'}
                </button>
            )}
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        maxWidth: '400px',
        margin: '0 auto',
    },
    title: {
        fontSize: '2rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '2rem',
        textAlign: 'left',
        width: '100%',
    },
    progress: {
        width: '100%',
        marginBottom: '3rem',
    },
    progressBar: {
        width: '100%',
        height: '4px',
        backgroundColor: '#E2E8F0',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '0.5rem',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'var(--primary)',
        transition: 'width 0.3s ease',
    },
    progressText: {
        fontSize: '0.875rem',
        color: 'var(--text-sub)',
    },
    questionContainer: {
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    question: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-main)',
        textAlign: 'center',
        marginBottom: '2rem',
        lineHeight: '1.4',
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        color: '#DC2626',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        textAlign: 'center',
        marginBottom: '1rem',
        width: '100%',
    },
    inputContainer: {
        width: '100%',
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '1rem',
        fontSize: '1.25rem',
        border: 'none',
        borderBottom: '2px solid var(--primary)',
        backgroundColor: 'transparent',
        textAlign: 'center',
        outline: 'none',
    },
    suffix: {
        position: 'absolute',
        right: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '1.25rem',
        color: 'var(--text-sub)',
    },
    optionsContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    optionButton: {
        width: '100%',
        padding: '1.25rem',
        fontSize: '1.1rem',
        fontWeight: '500',
        color: 'var(--text-main)',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    nextButton: {
        width: '100%',
        padding: '1rem',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        marginTop: '2rem',
        boxShadow: '0 4px 12px rgba(47, 133, 90, 0.25)',
    },
};
