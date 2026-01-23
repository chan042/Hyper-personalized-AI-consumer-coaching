"use client";

/**
 * [파일 역할]
 * - 최초 회원가입 사용자를 위한 정보 수집 온보딩 페이지입니다.
 * - 질문-답변 형식으로 정보를 순차적으로 수집합니다.
 * - 캐릭터를 선택한 후 이름을 입력합니다.
 * - 완료 후 메인 페이지로 이동합니다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { updateProfile } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

const CHARACTERS = [
    { id: 'char_cat', name: '고양이', image: '/images/characters/char_cat/body.png' },
    { id: 'char_dog', name: '강아지', image: '/images/characters/char_dog/body.png' },
    { id: 'char_ham', name: '햄스터', image: '/images/characters/char_ham/body.png' },
    { id: 'char_sheep', name: '양', image: '/images/characters/char_sheep/body.png' },
];

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
    // 0 ~ (questions.length - 1): 질문 단계
    // questions.length: 캐릭터 선택
    // questions.length + 1: 캐릭터 이름 (마자막)
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 캐릭터 관련 상태
    const [selectedCharacter, setSelectedCharacter] = useState('');
    const [characterName, setCharacterName] = useState('');

    const router = useRouter();
    const { refreshUser } = useAuth();

    const totalSteps = questions.length + 2;

    // 현재 단계가 질문 단계인지 확인
    const isQuestionStep = currentStep < questions.length;
    const currentQuestion = isQuestionStep ? questions[currentStep] : null;

    // 캐릭터 선택 처리 (두 번 누르면 선택 해제)
    const handleCharacterSelect = (characterId) => {
        if (selectedCharacter === characterId) {
            setSelectedCharacter(''); // 같은 캐릭터 두 번 클릭 시 선택 해제
        } else {
            setSelectedCharacter(characterId); // 다른 캐릭터 선택 시 변경
        }
    };

    // 캐릭터 선택 다음 단계로 (이름 입력으로 이동)
    const handleCharacterNext = () => {
        if (!selectedCharacter) {
            setError('캐릭터를 선택해주세요.');
            return;
        }
        setError('');
        setCurrentStep(prev => prev + 1);
    };

    // 캐릭터 이름 입력 후 완료 (최종 제출)
    const handleCharacterNameSubmit = async () => {
        if (!characterName.trim()) {
            setError('캐릭터 이름을 입력해주세요.');
            return;
        }
        setError('');

        setLoading(true);
        try {
            await updateProfile({
                ...answers,
                character_type: selectedCharacter,
                character_name: characterName,
                is_profile_complete: true
            });
            await refreshUser();
            router.push('/');
        } catch (err) {
            console.error('프로필 저장 실패:', err);
            setError('저장에 실패했습니다. 다시 시도해주세요.');
            setLoading(false);
        }
    };

    // 질문 답변 제출 처리 (다음 단계로 이동)
    const handleQuestionSubmit = () => {
        // 현재 답변 저장
        const newAnswers = {
            ...answers,
            [currentQuestion.id]: currentQuestion.type === 'number'
                ? Number(inputValue)
                : inputValue
        };
        setAnswers(newAnswers);
        setInputValue('');
        setError('');

        // 다음 질문 또는 캐릭터 선택 단계로 이동
        setCurrentStep(prev => prev + 1);
    };

    // 선택형 답변 처리
    const handleSelect = (value) => {
        const newAnswers = {
            ...answers,
            [currentQuestion.id]: value
        };
        setAnswers(newAnswers);
        setError('');

        // 다음 질문 또는 캐릭터 선택 단계로 이동
        setCurrentStep(prev => prev + 1);
    };

    // Enter 키 처리
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (isQuestionStep && currentQuestion.type !== 'select' && inputValue.trim()) {
                handleQuestionSubmit();
            } else if (currentStep === questions.length + 1 && characterName.trim()) {
                handleCharacterNameSubmit();
            }
        }
    };

    // 캐릭터 선택 단계 렌더링
    const renderCharacterSelection = () => (
        <>
            <h2 style={styles.question}>나만의 두둑이를 선택하세요!</h2>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.characterGrid}>
                {CHARACTERS.map((char) => (
                    <div
                        key={char.id}
                        onClick={() => handleCharacterSelect(char.id)}
                        style={{
                            ...styles.characterCard,
                            ...(selectedCharacter === char.id ? styles.characterCardSelected : {})
                        }}
                    >
                        <div style={styles.characterImageWrapper}>
                            <Image
                                src={char.image}
                                alt={char.name}
                                width={80}
                                height={80}
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                        <span style={styles.characterName}>{char.name}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={handleCharacterNext}
                disabled={!selectedCharacter}
                style={{
                    ...styles.nextButton,
                    opacity: !selectedCharacter ? 0.5 : 1,
                    cursor: !selectedCharacter ? 'not-allowed' : 'pointer'
                }}
            >
                다음
            </button>
        </>
    );

    // 캐릭터 이름 입력 단계 렌더링
    const renderCharacterNaming = () => (
        <>
            <h2 style={styles.question}>두둑이의 이름을 지어주세요!</h2>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.selectedCharacterPreview}>
                <Image
                    src={CHARACTERS.find(c => c.id === selectedCharacter)?.image || ''}
                    alt="선택된 캐릭터"
                    width={120}
                    height={120}
                    style={{ objectFit: 'contain' }}
                />
            </div>

            <div style={styles.inputContainer}>
                <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="예: 두둑이"
                    style={styles.input}
                    maxLength={20}
                    autoFocus
                    disabled={loading}
                />
            </div>

            <button
                onClick={handleCharacterNameSubmit}
                disabled={!characterName.trim() || loading}
                style={{
                    ...styles.nextButton,
                    opacity: !characterName.trim() || loading ? 0.5 : 1,
                    cursor: !characterName.trim() || loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? '저장 중...' : '완료'}
            </button>
        </>
    );

    // 질문 단계 렌더링
    const renderQuestion = () => (
        <>
            <h2 style={styles.question}>{currentQuestion.question}</h2>

            {error && <div style={styles.errorBox}>{error}</div>}

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

            {currentQuestion.type !== 'select' && (
                <button
                    onClick={handleQuestionSubmit}
                    disabled={!inputValue.trim() || loading}
                    style={{
                        ...styles.nextButton,
                        opacity: !inputValue.trim() || loading ? 0.5 : 1,
                        cursor: !inputValue.trim() || loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    다음
                </button>
            )}
        </>
    );

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
                            width: `${((currentStep + 1) / totalSteps) * 100}%`
                        }}
                    />
                </div>
                <span style={styles.progressText}>
                    {currentStep + 1} / {totalSteps}
                </span>
            </div>

            {/* 단계별 컨텐츠 */}
            <div style={styles.questionContainer}>
                {isQuestionStep && renderQuestion()}
                {currentStep === questions.length && renderCharacterSelection()}
                {currentStep === questions.length + 1 && renderCharacterNaming()}
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
        marginBottom: '2rem',
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
    },
    question: {
        fontSize: '1.4rem',
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
    characterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem',
        width: '100%',
    },
    characterCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        borderRadius: '16px',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
    },
    characterCardSelected: {
        borderColor: 'var(--primary)',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        boxShadow: '0 4px 12px rgba(47, 133, 90, 0.2)',
    },
    characterImageWrapper: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: '#f0f9ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.75rem',
        overflow: 'hidden',
    },
    characterName: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'var(--text-main)',
    },
    selectedCharacterPreview: {
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        backgroundColor: '#f0f9ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
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
