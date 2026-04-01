"use client";

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const DEFAULT_PROMPT_LABELS = {
    promptLabelHeader: '이미지 선택',
    promptLabelPhoto: '갤러리에서 선택',
    promptLabelPicture: '사진 촬영',
    promptLabelCancel: '취소',
};

const CANCEL_ERROR_PATTERNS = [
    'cancel',
    'user cancelled',
    'user canceled',
];

const getSafeImageExtension = (format, mimeType) => {
    const normalizedFormat = format?.toLowerCase();

    if (normalizedFormat === 'jpeg') {
        return 'jpg';
    }

    if (normalizedFormat) {
        return normalizedFormat;
    }

    const normalizedMimeType = mimeType?.toLowerCase();

    if (normalizedMimeType === 'image/jpeg') {
        return 'jpg';
    }

    if (normalizedMimeType?.startsWith('image/')) {
        return normalizedMimeType.split('/')[1];
    }

    return 'jpg';
};

const isCancelError = (error) => {
    const message = error?.message?.toLowerCase() || '';
    return CANCEL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const photoToFile = async (photo) => {
    if (!photo?.webPath) {
        throw new Error('선택한 이미지 경로를 찾을 수 없습니다.');
    }

    const response = await fetch(photo.webPath);

    if (!response.ok) {
        throw new Error('이미지 파일을 불러오지 못했습니다.');
    }

    const blob = await response.blob();
    const extension = getSafeImageExtension(photo.format, blob.type);
    const mimeType = blob.type || `image/${extension}`;

    return new File(
        [blob],
        `image-${Date.now()}.${extension}`,
        {
            type: mimeType,
            lastModified: Date.now(),
        },
    );
};

export const canUseNativeImagePrompt = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    if (typeof Capacitor.isNativePlatform === 'function' && !Capacitor.isNativePlatform()) {
        return false;
    }

    if (typeof Capacitor.isPluginAvailable === 'function') {
        return Capacitor.isPluginAvailable('Camera');
    }

    return true;
};

export const pickImageWithPrompt = async (options = {}) => {
    try {
        const photo = await Camera.getPhoto({
            quality: 90,
            correctOrientation: true,
            resultType: CameraResultType.Uri,
            source: CameraSource.Prompt,
            ...DEFAULT_PROMPT_LABELS,
            ...options,
        });

        if (!photo) {
            return null;
        }

        return photoToFile(photo);
    } catch (error) {
        if (isCancelError(error)) {
            return null;
        }

        throw error;
    }
};
