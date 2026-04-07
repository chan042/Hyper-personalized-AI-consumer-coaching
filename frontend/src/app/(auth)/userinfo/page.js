"use client";

/**
 * [파일 역할]
 * - 최초 회원가입 사용자를 위한 정보 수집 온보딩 페이지입니다.
 * - 질문-답변 형식으로 정보를 순차적으로 수집합니다.
 * - 캐릭터를 선택한 후 이름을 입력합니다.
 * - 완료 후 메인 페이지로 이동합니다.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { updateProfile } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

const CHARACTERS = [
    { id: 'char_cat', name: '고양이', image: '/images/characters/char_cat/body.png', desc: '호기심 많고 도도한' },
    { id: 'char_dog', name: '강아지', image: '/images/characters/char_dog/body.png', desc: '활발하고 긍정적인' },
    { id: 'char_ham', name: '햄스터', image: '/images/characters/char_ham/body.png', desc: '알뜰살뜰 부지런한' },
    { id: 'char_sheep', name: '양', image: '/images/characters/char_sheep/body.png', desc: '온화하고 신중한' },
];

const questions = [
    {
        id: 'age',
        question: '나이를 입력해주세요',
        placeholder: '연도 선택',
        type: 'year'
    },
    {
        id: 'job',
        question: '어떤 일을 하고 계신가요?',
        placeholder: '예) 개발자, 대학생',
        type: 'text'
    },
    {
        id: 'hobbies',
        question: '요즘 푹 빠진 취미가 있나요?',
        placeholder: '예) 러닝, 독서, 요리',
        type: 'text'
    },
    {
        id: 'self_development_field',
        question: '관심 있는 자기계발 분야를 알려주세요!',
        placeholder: '예) 재테크, 어학, 운동',
        type: 'text'
    },
    {
        id: 'marital_status',
        question: '결혼 여부를 알려주세요',
        options: [
            { value: 'SINGLE', label: '미혼' },
            { value: 'MARRIED', label: '기혼' }
        ],
        type: 'select'
    },
    {
        id: 'monthly_budget',
        question: '한 달 목표 예산은 얼마인가요?',
        placeholder: '금액 입력',
        suffix: '원',
        type: 'number'
    },
    {
        id: 'spending_to_improve',
        question: '가장 줄이고 싶은 지출은요?',
        placeholder: '예) 배달음식, 택시비',
        type: 'text'
    }
];

export default function UserInfoPage() {
    const INTRO_STEP = 0;
    const FIRST_QUESTION_STEP = 1;
    const CHARACTER_SELECTION_STEP = questions.length + 1;
    const CHARACTER_NAMING_STEP = questions.length + 2;
    const totalSteps = questions.length + 2; // 질문 + 캐릭터선택 + 캐릭터이름 (안내 단계 제외한 순수 진행 단계 수)

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [draftAnswers, setDraftAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const stepTransitionLockRef = useRef(false);

    const [selectedCharacter, setSelectedCharacter] = useState('');
    const [characterName, setCharacterName] = useState('');

    const router = useRouter();
    const { refreshUser } = useAuth();

    const isIntroStep = currentStep === INTRO_STEP;
    const isQuestionStep = currentStep >= FIRST_QUESTION_STEP && currentStep <= questions.length;
    const currentQuestion = isQuestionStep ? questions[currentStep - FIRST_QUESTION_STEP] : null;

    const isBudgetQuestion = (question) => question?.id === 'monthly_budget';

    const formatInput = (value, type) => {
        if (type === 'number' || type === 'budget' || type === 'year') {
            const digits = String(value ?? '').replace(/\D/g, '');
            if (!digits) return '';
            if (type === 'budget') return Number(digits).toLocaleString('ko-KR');
            return digits;
        }
        return value;
    };

    const getQuestionValue = (question) => {
        const draftValue = draftAnswers[question.id];
        if (draftValue !== undefined && draftValue !== null) return draftValue;
        
        const savedValue = answers[question.id];
        if (savedValue === undefined || savedValue === null) return '';
        
        return formatInput(savedValue, isBudgetQuestion(question) ? 'budget' : question.type);
    };

    const currentInputValue = isQuestionStep && currentQuestion?.type !== 'select'
        ? getQuestionValue(currentQuestion)
        : '';

    useEffect(() => {
        stepTransitionLockRef.current = false;
        setIsFocused(true);
    }, [currentStep]);

    const goToNextStep = () => {
        if (stepTransitionLockRef.current) return;
        stepTransitionLockRef.current = true;
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError('');
        if (currentStep === INTRO_STEP) {
            router.back();
        } else {
            stepTransitionLockRef.current = false;
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleInputChange = (value) => {
        const nextValue = formatInput(value, isBudgetQuestion(currentQuestion) ? 'budget' : currentQuestion.type);
        setDraftAnswers(prev => ({ ...prev, [currentQuestion.id]: nextValue }));
    };

    const handleQuestionSubmit = () => {
        if (!currentInputValue.trim()) return;
        
        const parseValue = (value, type) => {
            if (type === 'number' || type === 'budget' || type === 'year') {
                const digits = String(value).replace(/\D/g, '');
                return digits ? Number(digits) : 0;
            }
            return value;
        };

        setAnswers({
            ...answers,
            [currentQuestion.id]: parseValue(currentInputValue, isBudgetQuestion(currentQuestion) ? 'budget' : currentQuestion.type)
        });
        setError('');
        goToNextStep();
    };

    const handleSelect = (value) => {
        setAnswers({ ...answers, [currentQuestion.id]: value });
        setDraftAnswers({ ...draftAnswers, [currentQuestion.id]: value });
        setError('');
    };

    const handleCharacterNameSubmit = async () => {
        if (!characterName.trim()) return;
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
            setError('저장에 실패했습니다.');
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.repeat) return;
        e.preventDefault();
        
        if (isQuestionStep && currentQuestion.type !== 'select' && currentInputValue.trim()) {
            handleQuestionSubmit();
        } else if (currentStep === CHARACTER_NAMING_STEP && characterName.trim()) {
            handleCharacterNameSubmit();
        }
    };

    const BackIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    );

    const renderIntro = () => (
        <div style={styles.contentWrapper}>
            <div style={styles.textCenter}>
                <h1 style={styles.mainTitle}>반갑습니다!</h1>
                <p style={styles.mainSubtitle}>
                    더 똑똑한 소비 코칭을 위해<br/>
                    몇 가지 간단한 질문에 답해주세요.
                </p>
            </div>
            <div style={styles.actionContainer}>
                <button style={styles.primaryButton} onClick={goToNextStep}>
                    시작하기
                </button>
            </div>
        </div>
    );

    const renderQuestion = () => (
        <div style={styles.contentWrapper}>
            <h2 style={styles.questionTitle}>{currentQuestion.question}</h2>
            
            {error && <div style={styles.errorBox}>{error}</div>}

            {currentQuestion.type === 'select' ? (
                <div style={styles.optionsList}>
                    {currentQuestion.options.map(opt => (
                        <button
                            key={opt.value}
                            style={{
                                ...styles.optionButton,
                                ...(answers[currentQuestion.id] === opt.value ? styles.optionButtonActive : {})
                            }}
                            onClick={() => {
                                handleSelect(opt.value);
                                setTimeout(() => goToNextStep(), 300); // 부드러운 자동 진행
                            }}
                            disabled={loading}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            ) : currentQuestion.type === 'year' ? (
                <div style={styles.inputGroup}>
                    <div style={{
                        ...styles.inputRow,
                        ...(isFocused ? styles.inputRowFocus : {})
                    }}>
                        <select
                            value={currentInputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{...styles.hugeInput, appearance: 'none', backgroundColor: 'transparent'}}
                        >
                            <option value="" disabled hidden>연도 선택</option>
                            {Array.from({ length: 100 }).map((_, i) => {
                                const year = new Date().getFullYear() - i;
                                return (
                                    <option key={year} value={year}>{year}년</option>
                                );
                            })}
                        </select>
                        <div style={{ pointerEvents: 'none', marginLeft: '-1.5rem', color: '#111827' }}>▼</div>
                    </div>
                    
                    <div style={styles.actionContainer}>
                        <button 
                            style={{
                                ...styles.primaryButton,
                                ...(!String(currentInputValue).trim() ? styles.primaryButtonDisabled : {})
                            }} 
                            disabled={!String(currentInputValue).trim()}
                            onClick={handleQuestionSubmit}
                        >
                            확인
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.inputGroup}>
                    <div style={{
                        ...styles.inputRow,
                        ...(isFocused ? styles.inputRowFocus : {})
                    }}>
                        <input
                            type={isBudgetQuestion(currentQuestion) || currentQuestion.type === 'number' ? 'text' : currentQuestion.type}
                            inputMode={isBudgetQuestion(currentQuestion) || currentQuestion.type === 'number' ? 'numeric' : 'text'}
                            value={currentInputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={currentQuestion.placeholder}
                            style={styles.hugeInput}
                            autoFocus
                        />
                        {currentQuestion.suffix && currentInputValue && (
                            <span style={styles.inputSuffix}>{currentQuestion.suffix}</span>
                        )}
                    </div>
                    
                    <div style={styles.actionContainer}>
                        <button 
                            style={{
                                ...styles.primaryButton,
                                ...(!currentInputValue.trim() ? styles.primaryButtonDisabled : {})
                            }} 
                            disabled={!currentInputValue.trim()}
                            onClick={handleQuestionSubmit}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderCharacterSelection = () => (
        <div style={styles.contentWrapper}>
            <h2 style={styles.questionTitle}>어떤 두둑이와 함께할까요?</h2>
            <p style={styles.questionSubtitle}>나의 성향과 어울리는 캐릭터를 골라주세요.</p>
            
            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.charGrid}>
                {CHARACTERS.map(char => (
                    <div
                        key={char.id}
                        style={{
                            ...styles.charCard,
                            ...(selectedCharacter === char.id ? styles.charCardActive : {})
                        }}
                        onClick={() => setSelectedCharacter(char.id)}
                    >
                        <Image src={char.image} alt={char.name} width={90} height={90} style={styles.charImage} />
                        <p style={styles.charDesc}>{char.desc}</p>
                    </div>
                ))}
            </div>

            <div style={styles.actionContainer}>
                <button 
                    style={{
                        ...styles.primaryButton,
                        ...(!selectedCharacter ? styles.primaryButtonDisabled : {})
                    }} 
                    disabled={!selectedCharacter}
                    onClick={goToNextStep}
                >
                    선택 완료
                </button>
            </div>
        </div>
    );

    const renderCharacterNaming = () => (
        <div style={styles.contentWrapper}>
            <h2 style={styles.questionTitle}>두둑이의 이름을 지어주세요!</h2>
            
            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.centerPreview}>
                <Image
                    src={CHARACTERS.find(c => c.id === selectedCharacter)?.image || ''}
                    alt="Selected Character"
                    width={140} height={140}
                    style={styles.charImage}
                />
            </div>

            <div style={styles.inputGroup}>
                <div style={{
                    ...styles.inputRow,
                    ...(isFocused ? styles.inputRowFocus : {})
                }}>
                    <input
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="최대 10자"
                        style={{...styles.hugeInput, textAlign: 'center'}}
                        maxLength={10}
                        autoFocus
                    />
                </div>
                
                <div style={styles.actionContainer}>
                    <button 
                        style={{
                            ...styles.primaryButton,
                            ...((!characterName.trim() || loading) ? styles.primaryButtonDisabled : {})
                        }} 
                        disabled={!characterName.trim() || loading}
                        onClick={handleCharacterNameSubmit}
                    >
                        {loading ? '저장 중...' : '시작하기'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Calculate progress (0 to 1) excluding Intro step
    const currentProgressStep = currentStep === INTRO_STEP ? 0 : currentStep;
    
    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button style={styles.backBtn} onClick={handleBack}>
                    <BackIcon />
                </button>
                <div style={styles.progressArea}>
                    {Array.from({ length: totalSteps }).map((_, idx) => (
                        <div 
                            key={idx} 
                            style={{
                                ...styles.progressDot,
                                ...(idx < currentProgressStep ? styles.progressActive : styles.progressInactive)
                            }} 
                        />
                    ))}
                </div>
                <div style={{ width: '40px' }} /> {/* Spacer to balance header */}
            </header>

            <main style={styles.contentArea}>
                {isIntroStep && renderIntro()}
                {isQuestionStep && renderQuestion()}
                {currentStep === CHARACTER_SELECTION_STEP && renderCharacterSelection()}
                {currentStep === CHARACTER_NAMING_STEP && renderCharacterNaming()}
            </main>
            
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        maxWidth: '480px',
        margin: '0 auto',
        position: 'relative',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        height: '4rem',
        position: 'relative',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        padding: '0.5rem',
        margin: '-0.5rem',
        cursor: 'pointer',
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    progressArea: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '0 1rem',
    },
    progressDot: {
        height: '4px',
        flex: 1,
        maxWidth: '24px',
        borderRadius: '2px',
        transition: 'background-color 0.3s ease',
    },
    progressActive: {
        backgroundColor: '#14B8A6',
    },
    progressInactive: {
        backgroundColor: '#E5E7EB',
    },
    contentArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1.5rem 2rem',
    },
    contentWrapper: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        animation: 'fadeIn 0.3s ease-out forwards',
    },
    textCenter: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingBottom: '10vh',
        textAlign: 'center',
    },
    mainTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '0.75rem',
    },
    mainSubtitle: {
        fontSize: '1rem',
        color: '#6B7280',
        lineHeight: '1.6',
    },
    questionTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        lineHeight: '1.4',
        marginBottom: '0.5rem',
        wordBreak: 'keep-all',
    },
    questionSubtitle: {
        fontSize: '0.9375rem',
        color: '#6B7280',
        marginBottom: '2rem',
    },
    optionsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginTop: '2rem',
    },
    optionButton: {
        width: '100%',
        padding: '1.25rem 1.5rem',
        fontSize: '1.0625rem',
        fontWeight: '600',
        color: '#374151',
        backgroundColor: '#F9FAFB',
        border: '2px solid transparent',
        borderRadius: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
    },
    optionButtonActive: {
        backgroundColor: '#F0FDFA',
        borderColor: '#14B8A6',
        color: '#0D9488',
    },
    inputGroup: {
        marginTop: '2rem',
        display: 'flex',
        flexDirection: 'column',
    },
    inputRow: {
        display: 'flex',
        alignItems: 'baseline',
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '0.75rem',
        transition: 'border-color 0.2s',
    },
    inputRowFocus: {
        borderBottomColor: '#14B8A6',
    },
    hugeInput: {
        width: '100%',
        fontSize: '1.75rem',
        fontWeight: '600',
        color: '#111827',
        border: 'none',
        background: 'transparent',
        outline: 'none',
        padding: 0,
    },
    inputSuffix: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#111827',
        marginLeft: '0.5rem',
        whiteSpace: 'nowrap',
    },
    actionContainer: {
        marginTop: '2.5rem',
    },
    primaryButton: {
        width: '100%',
        height: '3.5rem',
        backgroundColor: '#14B8A6',
        color: '#FFFFFF',
        fontSize: '1.0625rem',
        fontWeight: '700',
        border: 'none',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#E5E7EB',
        color: '#9CA3AF',
        cursor: 'not-allowed',
    },
    charGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginTop: '1rem',
    },
    charCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 1rem',
        backgroundColor: '#F9FAFB',
        border: '2px solid transparent',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    charCardActive: {
        backgroundColor: '#F0FDFA',
        borderColor: '#14B8A6',
    },
    charImage: {
        objectFit: 'contain',
        marginBottom: '1rem',
    },
    charDesc: {
        fontSize: '0.8125rem',
        color: '#6B7280',
        textAlign: 'center',
        wordBreak: 'keep-all',
    },
    centerPreview: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '2rem',
        marginBottom: '1.5rem',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '500',
        marginTop: '1rem',
    },
};
