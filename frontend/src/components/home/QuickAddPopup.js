"use client";

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import QuickAddInput from './QuickAddInput';
import ReceiptScan from './ReceiptScan';
import ImageMatching from './ImageMatching';
import ImageMatchEntry from './ImageMatchEntry';
import ImageMatchStoreConfirm from './ImageMatchStoreConfirm';
import TransactionConfirm from './TransactionConfirm';
import { parseTransaction, createTransaction } from '../../lib/api/transaction';
import { scanReceipt } from '../../lib/api/ocr';
import { analyzeStoreFromImage, isImageMatchMockMode, resolveImageMatchPrice } from '../../lib/api/imageMatch';

const createInitialImageMatchState = () => ({
    imageFile: null,
    imagePreviewUrl: '',
    menuName: '',
    sessionId: '',
    analyzedStoreName: '',
    confirmedStoreName: '',
    manualStoreName: '',
    showManualStoreInput: false,
    matchMeta: null,
});

function ImageMatchMockNotice() {
    return (
        <div style={styles.mockNotice}>
            <div style={styles.mockNoticeBadge}>
                <Sparkles size={14} />
                <span>Mock Preview</span>
            </div>
            <p style={styles.mockNoticeText}>백엔드 없이 UI를 확인하는 중이에요. 분석 결과와 가격은 데모 데이터로 채워집니다.</p>
        </div>
    );
}

export default function QuickAddPopup({ onClose, onTransactionAdded, selectedDate }) {
    const [step, setStep] = useState('input');
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [confirmSource, setConfirmSource] = useState('text');
    const [imageMatchState, setImageMatchState] = useState(createInitialImageMatchState);

    // 배경 스크롤 방지
    useEffect(() => {
        // 현재 스크롤 위치 저장
        const scrollY = window.scrollY;

        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';

        // cleanup: 컴포넌트 언마운트 시 스크롤 복원
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (imageMatchState.imagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(imageMatchState.imagePreviewUrl);
            }
        };
    }, [imageMatchState.imagePreviewUrl]);

    const openConfirmStep = (data, source) => {
        setParsedData(data);
        setConfirmSource(source);
        setStep('confirm');
    };

    const handleRecordClick = async () => {
        if (!inputText.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const data = await parseTransaction(inputText);
            openConfirmStep(data, 'text');
        } catch (error) {
            console.error('Failed to parse transaction:', error);
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
            const isServerBusy = error.response?.status === 503 || error.response?.status === 500;

            if (isTimeout || isServerBusy) {
                alert('AI 분석 서버가 바쁩니다. 잠시 후 다시 시도해주세요.');
            } else {
                alert('분석에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 영수증 OCR 스캔 핸들러
    const handleReceiptScan = async (imageFile) => {
        setIsLoading(true);
        try {
            const data = await scanReceipt(imageFile);
            setParsedData(data);
            setInputText(''); // OCR 사용 시 텍스트 입력 초기화
            setStep('confirm');
        } catch (error) {
            console.error('Failed to scan receipt:', error);
            alert(error.message || '영수증 분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenImageMatch = () => {
        setParsedData(null);
        setConfirmSource('imageMatch');
        setImageMatchState(createInitialImageMatchState());
        setStep('imageMatchInput');
    };

    const handleImageSelect = (file) => {
        const previewUrl = URL.createObjectURL(file);

        setImageMatchState((prevState) => {
            if (prevState.imagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(prevState.imagePreviewUrl);
            }

            return {
                ...prevState,
                imageFile: file,
                imagePreviewUrl: previewUrl,
            };
        });
    };

    const handleAnalyzeStore = async () => {
        if (!imageMatchState.imageFile || !imageMatchState.menuName.trim()) {
            alert('사진과 메뉴명을 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const result = await analyzeStoreFromImage({
                imageFile: imageMatchState.imageFile,
                menuName: imageMatchState.menuName.trim(),
            });

            setImageMatchState((prevState) => ({
                ...prevState,
                sessionId: result.session_id || prevState.sessionId,
                menuName: result.menu_name || prevState.menuName,
                analyzedStoreName: result.store_name || '',
                confirmedStoreName: '',
                manualStoreName: '',
                showManualStoreInput: result.status === 'manual_store_required' || !result.store_name,
                matchMeta: null,
            }));
            setStep('storeConfirm');
        } catch (error) {
            console.error('Failed to analyze store:', error);
            alert(error.message || '이미지 분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectAnalyzedStore = () => {
        setImageMatchState((prevState) => ({
            ...prevState,
            showManualStoreInput: true,
            manualStoreName: '',
        }));
    };

    const startPriceResolution = async (confirmedStoreName, confirmationType) => {
        const normalizedStoreName = confirmedStoreName.trim();

        setIsLoading(true);
        setImageMatchState((prevState) => ({
            ...prevState,
            confirmedStoreName: normalizedStoreName,
        }));

        try {
            const result = await resolveImageMatchPrice({
                sessionId: imageMatchState.sessionId,
                confirmedStoreName: normalizedStoreName,
                confirmationType,
            });

            setImageMatchState((prevState) => ({
                ...prevState,
                confirmedStoreName: normalizedStoreName,
                matchMeta: result.match_meta || null,
            }));
            openConfirmStep(result.prefill, 'imageMatch');
        } catch (error) {
            console.error('Failed to resolve price:', error);
            alert(error.message || '가격 검색에 실패했습니다. 다시 시도해주세요.');
            setStep('storeConfirm');
            setImageMatchState((prevState) => ({
                ...prevState,
                confirmedStoreName: '',
                showManualStoreInput: confirmationType === 'manual_store_input' ? true : prevState.showManualStoreInput,
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAnalyzedStore = () => {
        if (!imageMatchState.analyzedStoreName.trim()) {
            handleRejectAnalyzedStore();
            return;
        }

        startPriceResolution(imageMatchState.analyzedStoreName, 'candidate_confirmed');
    };

    const handleSubmitManualStore = () => {
        if (!imageMatchState.manualStoreName.trim()) {
            alert('가게명을 입력해주세요.');
            return;
        }

        startPriceResolution(imageMatchState.manualStoreName, 'manual_store_input');
    };

    const handleSave = async (finalData) => {
        try {
            await createTransaction(finalData);
            alert('저장되었습니다!');

            if (onTransactionAdded) {
                onTransactionAdded();
            }

            onClose();
        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert('저장에 실패했습니다.');
        }
    };

    const confirmOriginalInput = confirmSource === 'text' ? inputText : '';
    const shouldShowMockNotice = isImageMatchMockMode && (
        step === 'imageMatchInput' ||
        step === 'storeConfirm' ||
        (step === 'confirm' && confirmSource === 'imageMatch')
    );

    return (
        <div style={styles.overlay}>
            <div style={styles.sheet}>
                <div style={styles.handleBar} />

                {step === 'input' ? (
                    <div style={styles.inputHeader}>
                        <h2 style={styles.inputHeaderTitle}>Quick Add</h2>
                        <button type="button" onClick={onClose} style={styles.iconButton}>
                            <X size={24} color="var(--text-main)" />
                        </button>
                    </div>
                ) : (
                    <div style={styles.closeHeader}>
                        <button type="button" onClick={onClose} style={styles.iconButton}>
                            <X size={24} color="var(--text-main)" />
                        </button>
                    </div>
                )}

                {shouldShowMockNotice ? <ImageMatchMockNotice /> : null}

                {step === 'input' && (
                    <>
                        <div style={styles.inputBody}>
                            <QuickAddInput value={inputText} onChange={setInputText} />

                            <div style={styles.quickActionRow}>
                                <ReceiptScan onImageSelect={handleReceiptScan} disabled={isLoading} />
                                <ImageMatching
                                    onClick={handleOpenImageMatch}
                                    disabled={isLoading}
                                    badgeLabel={isImageMatchMockMode ? 'Mock' : ''}
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleRecordClick}
                            disabled={isLoading}
                            style={{
                                ...styles.primaryActionButton,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                '기록하기'
                            )}
                        </button>
                    </>
                )}

                {step === 'imageMatchInput' && (
                    <ImageMatchEntry
                        previewUrl={imageMatchState.imagePreviewUrl}
                        menuName={imageMatchState.menuName}
                        onMenuNameChange={(menuName) => {
                            setImageMatchState((prevState) => ({
                                ...prevState,
                                menuName,
                            }));
                        }}
                        onImageSelect={handleImageSelect}
                        onAnalyze={handleAnalyzeStore}
                        disabled={isLoading}
                        isAnalyzing={isLoading}
                    />
                )}

                {step === 'storeConfirm' && (
                    <ImageMatchStoreConfirm
                        previewUrl={imageMatchState.imagePreviewUrl}
                        menuName={imageMatchState.menuName}
                        storeName={imageMatchState.analyzedStoreName}
                        manualStoreName={imageMatchState.manualStoreName}
                        showManualStoreInput={imageMatchState.showManualStoreInput}
                        onConfirm={handleConfirmAnalyzedStore}
                        onReject={handleRejectAnalyzedStore}
                        onManualStoreNameChange={(manualStoreName) => {
                            setImageMatchState((prevState) => ({
                                ...prevState,
                                manualStoreName,
                            }));
                        }}
                        onSubmitManualStore={handleSubmitManualStore}
                        disabled={isLoading}
                        isResolving={isLoading}
                    />
                )}

                {step === 'confirm' && (
                    <TransactionConfirm
                        initialData={parsedData}
                        onSave={handleSave}
                        selectedDate={selectedDate}
                        originalInput={confirmOriginalInput}
                    />
                )}

                <style jsx global>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    .animate-spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    sheet: {
        width: '100%',
        maxWidth: '430px',
        backgroundColor: 'var(--background-light)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '0.75rem 1.5rem 1.5rem',
        animation: 'slideUp 0.3s ease-out',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    handleBar: {
        width: '48px',
        height: '5px',
        backgroundColor: '#dbe3ea',
        borderRadius: '999px',
        margin: '0 auto 1rem',
    },
    inputHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
    },
    inputHeaderTitle: {
        fontSize: '1.25rem',
        fontWeight: '800',
        color: 'var(--text-main)',
    },
    closeHeader: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '0.5rem',
    },
    mockNotice: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        marginBottom: '1rem',
        padding: '0.9rem 1rem',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.1), rgba(255, 255, 255, 0.92))',
        border: '1px solid rgba(20, 184, 166, 0.16)',
    },
    mockNoticeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        width: 'fit-content',
        padding: '0.35rem 0.55rem',
        borderRadius: '999px',
        backgroundColor: 'rgba(20, 184, 166, 0.14)',
        color: 'var(--primary-dark)',
        fontSize: '0.78rem',
        fontWeight: '800',
    },
    mockNoticeText: {
        fontSize: '0.86rem',
        lineHeight: 1.55,
        color: 'var(--text-sub)',
        wordBreak: 'keep-all',
    },
    iconButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
    },
    inputBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    quickActionRow: {
        display: 'flex',
        gap: '1rem',
    },
    primaryActionButton: {
        width: '100%',
        padding: '1rem',
        backgroundColor: 'var(--primary)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
    },
};
