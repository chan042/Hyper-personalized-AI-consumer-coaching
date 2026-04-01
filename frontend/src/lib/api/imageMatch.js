import client from './client';
import { fileToBase64, getImageFormat, validateImageFile } from '../utils/imageUtils';

const IMAGE_MATCH_MOCK_SETTING = process.env.NEXT_PUBLIC_IMAGE_MATCH_MOCK;
const USE_IMAGE_MATCH_MOCK =
    IMAGE_MATCH_MOCK_SETTING === 'true' ||
    (process.env.NODE_ENV !== 'production' && IMAGE_MATCH_MOCK_SETTING !== 'false');
const mockSessions = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getTodayString = () => {
    return new Date().toISOString().slice(0, 10);
};

const getFriendlyErrorMessage = (error, fallbackMessage) => {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    if (isTimeout) {
        return '이미지 분석 서버가 바쁩니다. 잠시 후 다시 시도해주세요.';
    }

    if (error.response?.status === 404) {
        return '이미지 매칭 API가 아직 준비되지 않았습니다.';
    }

    return error.response?.data?.error || fallbackMessage;
};

const createMockSessionId = () => {
    return `im_mock_${Date.now()}`;
};

const resolveMockCategory = (menuName) => {
    const normalized = menuName.replace(/\s+/g, '');

    if (normalized.includes('아메리카노') || normalized.includes('라떼') || normalized.includes('커피') || normalized.includes('케이크')) {
        return '카페/간식';
    }

    return '식비';
};

const resolveMockAmount = (menuName) => {
    const normalized = menuName.replace(/\s+/g, '');
    const priceMap = [
        ['아이스아메리카노', 4500],
        ['아메리카노', 4500],
        ['카페라떼', 5000],
        ['라떼', 5000],
        ['카푸치노', 5000],
        ['샌드위치', 6900],
        ['케이크', 7900],
    ];

    const match = priceMap.find(([keyword]) => normalized.includes(keyword));
    return match ? match[1] : null;
};

const analyzeStoreMock = async ({ menuName }) => {
    await delay(900);

    const sessionId = createMockSessionId();
    const hasCandidateStore = !menuName.includes('직접입력');
    const storeName = hasCandidateStore ? '스타벅스 강남역점' : null;

    mockSessions.set(sessionId, {
        menuName,
        analyzedStoreName: storeName,
    });

    return {
        session_id: sessionId,
        menu_name: menuName,
        status: storeName ? 'store_identified' : 'manual_store_required',
        store_name: storeName,
    };
};

const resolvePriceMock = async ({ sessionId, confirmedStoreName }) => {
    await delay(900);

    const session = mockSessions.get(sessionId);

    if (!session) {
        throw new Error('이미지 매칭 세션을 찾을 수 없습니다.');
    }

    const amount = resolveMockAmount(session.menuName);

    return {
        status: amount ? 'matched' : 'not_found',
        prefill: {
            store: confirmedStoreName,
            item: session.menuName,
            amount,
            category: resolveMockCategory(session.menuName),
            date: getTodayString(),
        },
        match_meta: {
            source_type: amount ? 'mock_menu_page' : 'unknown',
            source_url: '',
            reason: amount ? '프론트 개발용 mock 응답입니다.' : '프론트 개발용 mock 응답이며 가격을 찾지 못했습니다.',
        },
    };
};

export const isImageMatchMockMode = USE_IMAGE_MATCH_MOCK;

export const analyzeStoreFromImage = async ({ imageFile, menuName }) => {
    const validation = validateImageFile(imageFile, 10);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    if (!menuName?.trim()) {
        throw new Error('메뉴명을 입력해주세요.');
    }

    if (USE_IMAGE_MATCH_MOCK) {
        return analyzeStoreMock({ menuName: menuName.trim() });
    }

    try {
        const imageData = await fileToBase64(imageFile);
        const format = getImageFormat(imageFile);

        const response = await client.post(
            '/api/transactions/image-match/analyze-store/',
            {
                imageData,
                format,
                menu_name: menuName.trim(),
            },
            {
                timeout: 30000,
            }
        );

        return response.data;
    } catch (error) {
        console.error('이미지 매칭 가게 분석 오류:', error);
        throw new Error(getFriendlyErrorMessage(error, '이미지 분석에 실패했습니다. 다시 시도해주세요.'));
    }
};

export const resolveImageMatchPrice = async ({ sessionId, confirmedStoreName, confirmationType }) => {
    if (!sessionId) {
        throw new Error('이미지 매칭 세션이 없습니다.');
    }

    if (!confirmedStoreName?.trim()) {
        throw new Error('가게명을 입력해주세요.');
    }

    if (USE_IMAGE_MATCH_MOCK) {
        return resolvePriceMock({
            sessionId,
            confirmedStoreName: confirmedStoreName.trim(),
        });
    }

    try {
        const response = await client.post(
            '/api/transactions/image-match/resolve-price/',
            {
                session_id: sessionId,
                confirmed_store_name: confirmedStoreName.trim(),
                confirmation_type: confirmationType,
            },
            {
                timeout: 30000,
            }
        );

        return response.data;
    } catch (error) {
        console.error('이미지 매칭 가격 검색 오류:', error);
        throw new Error(getFriendlyErrorMessage(error, '가격 검색에 실패했습니다. 다시 시도해주세요.'));
    }
};
