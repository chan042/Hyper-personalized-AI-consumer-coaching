"use client";

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canUseNativeImagePrompt, pickImageWithPrompt } from '@/lib/capacitor/camera';

export default function ImageMatchEntry({
    previewUrl,
    menuName,
    onMenuNameChange,
    onImageSelect,
    onAnalyze,
    disabled = false,
    isAnalyzing = false,
}) {
    const { isNativeApp } = useAuth();
    const fileInputRef = useRef(null);
    const [isPickingImage, setIsPickingImage] = useState(false);
    const isBusy = disabled || isPickingImage;
    const isReady = Boolean(previewUrl && menuName.trim());

    const handleTriggerFileSelect = async () => {
        if (isBusy) {
            return;
        }

        if (isNativeApp && canUseNativeImagePrompt()) {
            setIsPickingImage(true);

            try {
                const file = await pickImageWithPrompt();

                if (file && onImageSelect) {
                    onImageSelect(file);
                }
            } catch (error) {
                console.error('네이티브 이미지 선택 실패:', error);
                alert('이미지를 불러오지 못했습니다. 다시 시도해주세요.');
            } finally {
                setIsPickingImage(false);
            }

            return;
        }

        if (fileInputRef.current) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file && onImageSelect) {
            onImageSelect(file);
        }
        event.target.value = '';
    };

    return (
        <div style={styles.container}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isBusy}
            />

            <button
                type="button"
                onClick={handleTriggerFileSelect}
                disabled={isBusy}
                style={{
                    ...styles.previewButton,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    opacity: isBusy ? 0.7 : 1,
                }}
            >
                {previewUrl ? (
                    <>
                        <img
                            src={previewUrl}
                            alt="업로드한 가게 이미지 미리보기"
                            style={styles.previewImage}
                        />
                        <div style={styles.previewActionBadge}>
                            <ImagePlus size={14} />
                            <span>사진 바꾸기</span>
                        </div>
                    </>
                ) : (
                    <div style={styles.emptyPreview}>
                        <div style={styles.emptyIconShell}>
                            <Camera size={26} color="var(--primary)" />
                        </div>
                        <div style={styles.emptyCopy}>
                            <strong style={styles.emptyTitle}>가게 사진을 올려주세요</strong>
                            <span style={styles.emptyDescription}>간판, 메뉴판처럼 가게를 알 수 있는 사진일수록 정확해요</span>
                        </div>
                    </div>
                )}
            </button>

            <div style={styles.inputBlock}>
                <input
                    type="text"
                    value={menuName}
                    onChange={(event) => onMenuNameChange(event.target.value)}
                    placeholder="주문하신 메뉴를 입력해주세요"
                    style={styles.input}
                    disabled={isBusy}
                />
            </div>

            <button
                type="button"
                onClick={onAnalyze}
                disabled={!isReady || isBusy || isAnalyzing}
                style={{
                    ...styles.primaryButton,
                    opacity: !isReady || isBusy || isAnalyzing ? 0.55 : 1,
                    cursor: !isReady || isBusy || isAnalyzing ? 'not-allowed' : 'pointer',
                }}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        분석 중...
                    </>
                ) : (
                    '분석하기'
                )}
            </button>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        paddingBottom: '0.5rem',
    },
    previewButton: {
        position: 'relative',
        width: '100%',
        border: 'none',
        borderRadius: '28px',
        backgroundColor: '#ffffff',
        padding: '0.75rem',
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '260px',
        objectFit: 'cover',
        borderRadius: '22px',
        display: 'block',
    },
    previewActionBadge: {
        position: 'absolute',
        right: '1.25rem',
        bottom: '1.25rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.55rem 0.8rem',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        color: '#ffffff',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: '700',
        backdropFilter: 'blur(10px)',
    },
    emptyPreview: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        minHeight: '260px',
        borderRadius: '22px',
        backgroundColor: '#ffffff',
        border: '1px dashed rgba(20, 184, 166, 0.26)',
        padding: '1.5rem',
        textAlign: 'center',
    },
    emptyIconShell: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCopy: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        maxWidth: '240px',
    },
    emptyTitle: {
        fontSize: '1rem',
        color: 'var(--text-main)',
        lineHeight: 1.45,
        wordBreak: 'keep-all',
    },
    emptyDescription: {
        fontSize: '0.88rem',
        color: 'var(--text-sub)',
        lineHeight: 1.5,
        wordBreak: 'keep-all',
    },
    inputBlock: {
        backgroundColor: '#eef2f6',
        borderRadius: '18px',
        padding: '0 1rem',
    },
    input: {
        width: '100%',
        height: '56px',
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-main)',
    },
    primaryButton: {
        width: '100%',
        height: '56px',
        border: 'none',
        borderRadius: '18px',
        backgroundColor: 'var(--primary)',
        color: '#ffffff',
        fontSize: '1.05rem',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
    },
};
