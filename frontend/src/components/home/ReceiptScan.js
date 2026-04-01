"use client";

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canUseNativeImagePrompt, pickImageWithPrompt } from '@/lib/capacitor/camera';

/**
 * 영수증 스캔 버튼 컴포넌트
 * 모바일: 카메라 앱 직접 실행 (capture="environment")
 * 데스크톱: 파일 선택 다이얼로그
 * 
 * @param {Object} props
 * @param {Function} props.onImageSelect - 이미지 선택 시 호출되는 콜백 (File 객체 전달)
 * @param {boolean} props.disabled - 비활성화 여부
 */
export default function ReceiptScan({ onImageSelect, disabled = false }) {
    const { isNativeApp } = useAuth();
    const fileInputRef = useRef(null);
    const [isPickingImage, setIsPickingImage] = useState(false);
    const isButtonDisabled = disabled || isPickingImage;

    // 버튼 클릭 시 파일 입력 트리거
    const handleButtonClick = async () => {
        if (isButtonDisabled) {
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
            fileInputRef.current.click();
        }
    };

    // 파일 선택 시 콜백 호출
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && onImageSelect) {
            onImageSelect(file);
        }
        // 같은 파일 재선택을 위해 값 초기화
        e.target.value = '';
    };

    return (
        <>
            {/* 숨겨진 파일 입력 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"  // 모바일
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isButtonDisabled}
            />

            {/* 스캔 버튼 */}
            <button
                onClick={handleButtonClick}
                disabled={isButtonDisabled}
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                    gap: '0.5rem',
                    opacity: isButtonDisabled ? 0.7 : 1
                }}
            >
                <Camera color="var(--primary)" size={28} />
                <span style={{
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    color: 'var(--text-main)'
                }}>
                    영수증 스캔
                </span>
            </button>
        </>
    );
}
