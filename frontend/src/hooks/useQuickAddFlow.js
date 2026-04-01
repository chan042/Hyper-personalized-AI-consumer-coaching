"use client";

import { useEffect, useState } from 'react';
import { parseTransaction, createTransaction } from '@/lib/api/transaction';
import { scanReceipt } from '@/lib/api/ocr';
import { analyzeStoreFromImage, resolveImageMatchPrice } from '@/lib/api/imageMatch';

export const QUICK_ADD_STEPS = {
    INPUT: 'input',
    IMAGE_MATCH_INPUT: 'imageMatchInput',
    STORE_CONFIRM: 'storeConfirm',
    CONFIRM: 'confirm',
};

export const QUICK_ADD_LOADING = {
    PARSE: 'parse',
    OCR: 'ocr',
    ANALYZE_STORE: 'analyzeStore',
    RESOLVE_PRICE: 'resolvePrice',
    SAVE: 'save',
};

const createInitialImageMatchState = () => ({
    imageFile: null,
    imagePreviewUrl: '',
    menuName: '',
    sessionId: '',
    analyzedStoreName: '',
    manualStoreName: '',
    showManualStoreInput: false,
});

export default function useQuickAddFlow({ onClose, onTransactionAdded } = {}) {
    const [step, setStep] = useState(QUICK_ADD_STEPS.INPUT);
    const [inputText, setInputText] = useState('');
    const [loadingType, setLoadingType] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [confirmSource, setConfirmSource] = useState('text');
    const [imageMatchState, setImageMatchState] = useState(createInitialImageMatchState);

    useEffect(() => {
        return () => {
            if (imageMatchState.imagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(imageMatchState.imagePreviewUrl);
            }
        };
    }, [imageMatchState.imagePreviewUrl]);

    const isLoading = loadingType !== null;
    const confirmOriginalInput = confirmSource === 'text' ? inputText : '';

    const openConfirmStep = (data, source) => {
        setParsedData(data);
        setConfirmSource(source);
        setStep(QUICK_ADD_STEPS.CONFIRM);
    };

    const resetImageMatchState = () => {
        setImageMatchState((previousState) => {
            if (previousState.imagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previousState.imagePreviewUrl);
            }

            return createInitialImageMatchState();
        });
    };

    const handleRecordClick = async () => {
        if (!inputText.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }

        setLoadingType(QUICK_ADD_LOADING.PARSE);

        try {
            const data = await parseTransaction(inputText);
            openConfirmStep(data, 'text');
        } catch (error) {
            console.error('Failed to parse transaction:', error);
            alert(error.message || '분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoadingType(null);
        }
    };

    const handleReceiptScan = async (imageFile) => {
        setLoadingType(QUICK_ADD_LOADING.OCR);

        try {
            const data = await scanReceipt(imageFile);
            setInputText('');
            openConfirmStep(data, 'receipt');
        } catch (error) {
            console.error('Failed to scan receipt:', error);
            alert(error.message || '영수증 분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoadingType(null);
        }
    };

    const handleOpenImageMatch = () => {
        setParsedData(null);
        setConfirmSource('imageMatch');
        resetImageMatchState();
        setStep(QUICK_ADD_STEPS.IMAGE_MATCH_INPUT);
    };

    const handleImageSelect = (file) => {
        const previewUrl = URL.createObjectURL(file);

        setImageMatchState((previousState) => {
            if (previousState.imagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previousState.imagePreviewUrl);
            }

            return {
                ...previousState,
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

        setLoadingType(QUICK_ADD_LOADING.ANALYZE_STORE);

        try {
            const result = await analyzeStoreFromImage({
                imageFile: imageMatchState.imageFile,
                menuName: imageMatchState.menuName.trim(),
            });

            setImageMatchState((previousState) => ({
                ...previousState,
                sessionId: result.session_id || previousState.sessionId,
                menuName: result.menu_name || previousState.menuName,
                analyzedStoreName: result.store_name || '',
                manualStoreName: '',
                showManualStoreInput: result.status === 'manual_store_required' || !result.store_name,
            }));
            setStep(QUICK_ADD_STEPS.STORE_CONFIRM);
        } catch (error) {
            console.error('Failed to analyze store:', error);
            alert(error.message || '이미지 분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoadingType(null);
        }
    };

    const handleRejectAnalyzedStore = () => {
        setImageMatchState((previousState) => ({
            ...previousState,
            showManualStoreInput: true,
            manualStoreName: '',
        }));
    };

    const startPriceResolution = async (confirmedStoreName, confirmationType) => {
        const normalizedStoreName = confirmedStoreName.trim();

        setLoadingType(QUICK_ADD_LOADING.RESOLVE_PRICE);

        try {
            const result = await resolveImageMatchPrice({
                sessionId: imageMatchState.sessionId,
                confirmedStoreName: normalizedStoreName,
                confirmationType,
            });

            openConfirmStep(result.prefill, 'imageMatch');
        } catch (error) {
            console.error('Failed to resolve price:', error);
            alert(error.message || '가격 검색에 실패했습니다. 다시 시도해주세요.');
            setStep(QUICK_ADD_STEPS.STORE_CONFIRM);

            if (confirmationType === 'manual_store_input') {
                setImageMatchState((previousState) => ({
                    ...previousState,
                    showManualStoreInput: true,
                }));
            }
        } finally {
            setLoadingType(null);
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
        setLoadingType(QUICK_ADD_LOADING.SAVE);

        try {
            await createTransaction(finalData);
            alert('저장되었습니다!');
            onTransactionAdded?.();
            onClose?.();
        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert(error.message || '저장에 실패했습니다.');
        } finally {
            setLoadingType(null);
        }
    };

    const handleBack = () => {
        if (step === QUICK_ADD_STEPS.IMAGE_MATCH_INPUT) {
            setStep(QUICK_ADD_STEPS.INPUT);
            return;
        }

        if (step === QUICK_ADD_STEPS.STORE_CONFIRM) {
            setStep(QUICK_ADD_STEPS.IMAGE_MATCH_INPUT);
        }
    };

    return {
        step,
        inputText,
        setInputText,
        loadingType,
        isLoading,
        parsedData,
        confirmOriginalInput,
        imageMatchState,
        handleRecordClick,
        handleReceiptScan,
        handleOpenImageMatch,
        handleImageSelect,
        handleAnalyzeStore,
        handleRejectAnalyzedStore,
        handleConfirmAnalyzedStore,
        handleSubmitManualStore,
        handleSave,
        handleBack,
        setImageMatchMenuName: (menuName) => {
            setImageMatchState((previousState) => ({
                ...previousState,
                menuName,
            }));
        },
        setManualStoreName: (manualStoreName) => {
            setImageMatchState((previousState) => ({
                ...previousState,
                manualStoreName,
            }));
        },
    };
}
