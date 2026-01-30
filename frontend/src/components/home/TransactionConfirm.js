"use client";
// Quick Add에서 자연어 분석 후 상세 정보를 입력/수정하는 화면


// 외부 라이브러리 및 아이콘 임포트
import { Edit2, ChevronRight, Search, MapPin, Calendar, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

import CalculatorInput from '../common/CalculatorInput';       // 금액 계산기 모달
import DateWheelPicker from '../common/DateWheelPicker';       // 날짜 휠 선택 모달
import KakaoLocationPicker from '../common/KakaoLocationPicker'; // 카카오맵 장소 검색 모달
import { getCategoryIcon, CATEGORIES, CATEGORY_COLORS, normalizeCategory } from '../common/CategoryIcons'; // 카테고리 아이콘/색상

// ============================================================
// 헬퍼 함수: 초기 위치 데이터 보정
// 주소가 없고 원본 입력이 있는 경우, 원본 입력에서 금액/상품명을 제외한 텍스트를 장소명으로 사용
// ============================================================
const getSmartLocation = (data, input) => {
    const address = (data?.address || '').trim();
    let placeName = data?.store || '';

    // 1. 주소 유무와 관계없이 원본 입력이 있으면 보정 시도
    if (input) {
        let cleaned = input;

        // 금액 제거
        cleaned = cleaned.replace(/(\s|^)(₩?[\d,]+원?)(\s|$)/g, ' ').trim();

        // 상품명(item) 제거 방어 로직
        const initialItem = (data?.item || '').trim();
        if (initialItem && cleaned.includes(initialItem)) {
            const candidate = cleaned.replace(initialItem, '').trim();
            // 제거 후 빈 문자열이 되면 제거하지 않음 (예: item이 "구로역 할리스커피" 전체인 경우)
            if (candidate.length > 0) {
                cleaned = candidate;
            }
        }

        // 공백 정리
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        if (cleaned) {
            placeName = cleaned;
        }
    }

    return {
        address,
        placeName,
        lat: null,
        lng: null
    };
};



export default function TransactionConfirm({ initialData, onSave, selectedDate, originalInput = '' }) {
    // --------------------------------------------------------------------------------
    // 1. State Declarations (Must be at the top to avoid TDZ)
    // --------------------------------------------------------------------------------

    // 폼 입력 상태
    const [amount, setAmount] = useState(initialData?.amount || 0);           // 금액
    const [category, setCategory] = useState(initialData?.category || '카페/간식'); // 카테고리
    const [item, setItem] = useState(initialData?.item || '');                 // 상품명
    const [store, setStore] = useState(initialData?.store || '');              // 소비처
    const [rawDate, setRawDate] = useState(                                    // 날짜
        selectedDate ? new Date(selectedDate) : (initialData?.date ? new Date(initialData.date) : new Date())
    );

    // 위치 정보 상태
    const [location, setLocation] = useState(() => getSmartLocation(initialData, originalInput));

    // 고정 지출 여부 토글 상태
    const [isRecurring, setIsRecurring] = useState(false);

    // 모달 표시 상태
    const [showCalculator, setShowCalculator] = useState(false);      // 금액 계산기 모달
    const [showDatePicker, setShowDatePicker] = useState(false);      // 날짜 선택 모달
    const [showCategoryPicker, setShowCategoryPicker] = useState(false); // 카테고리 선택 모달
    const [showLocationPicker, setShowLocationPicker] = useState(false); // 장소 검색 모달

    // --------------------------------------------------------------------------------
    // 2. Helper Functions & Effects
    // --------------------------------------------------------------------------------

    // 초기 검색어 결정 로직
    const getInitialSearchQuery = () => {
        // 1. 보정된 장소명(placeName)이 있다면 최우선 사용 (화면 표시 텍스트와 검색어 일치)
        // 예: 사용자가 "구로 할리스" 입력 -> placeName="구로 할리스" -> 검색창에도 "구로 할리스" 표시
        if (location.placeName) {
            return location.placeName;
        }

        // 2. AI가 주소를 추출 + 소비처가 있는 경우: 주소 + 소비처 조합
        if (location.address && store) {
            return `${location.address} ${store}`;
        }

        // 3. 마지막 수단: 소비처 또는 주소
        return store || location.address;
    };

    // inside return
    <KakaoLocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(newLocation) => setLocation(newLocation)}
        initialAddress={location.address}
        initialPlaceName={getInitialSearchQuery()}
    />



    // useEffect - 초기 데이터 동기화
    // AI 분석이 완료되어 initialData가 변경되면 폼 상태를 업데이트
    useEffect(() => {
        if (initialData) {
            setAmount(initialData.amount || 0);
            setCategory(initialData.category || '카페/간식');
            setItem(initialData.item || '');
            setStore(initialData.store || '');
            setRawDate(
                selectedDate ? new Date(selectedDate) : (initialData.date ? new Date(initialData.date) : new Date())
            );
            setLocation(getSmartLocation(initialData, originalInput));
        }
    }, [initialData, selectedDate, originalInput]);




    // 날짜 포맷팅
    const formatDateDisplay = () => {
        const month = rawDate.getMonth() + 1;
        const day = rawDate.getDate();
        return `${month}월 ${day}일`;
    };

    // 카테고리에 해당하는 색상 반환
    const getCategoryColor = (cat) => {
        const normalized = normalizeCategory(cat);
        return CATEGORY_COLORS[normalized] || '#f59e0b';
    };

    // 렌더링
    return (
        <div style={{ paddingBottom: '1rem' }}>

            {/* ----------------------------------------
                섹션 1: 금액 표시 (헤더)
                - 클릭하면 계산기 모달이 열림
            ---------------------------------------- */}
            <div
                onClick={() => setShowCalculator(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    cursor: 'pointer'
                }}
            >
                <span style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: 'var(--text-main)'
                }}>₩{amount.toLocaleString()}</span>
                <Edit2 size={18} color="var(--text-sub)" />
            </div>

            {/* ----------------------------------------
                섹션 2: 카테고리 & 날짜 선택 버튼 (가로 배치)
            ---------------------------------------- */}
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                {/* 카테고리 선택 버튼 */}
                <div
                    onClick={() => setShowCategoryPicker(true)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.875rem 1rem',
                        cursor: 'pointer'
                    }}
                >
                    {/* 카테고리 아이콘 */}
                    <div style={{
                        backgroundColor: `${getCategoryColor(category)}20`,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {getCategoryIcon(category, 20)}
                    </div>
                    {/* 카테고리 라벨 및 값 */}
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.125rem' }}>카테고리</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{category}</p>
                    </div>
                </div>

                {/* 날짜 선택 버튼 */}
                <div
                    onClick={() => setShowDatePicker(true)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.875rem 1rem',
                        cursor: 'pointer'
                    }}
                >
                    {/* 날짜 아이콘 */}
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calendar size={20} color="#3b82f6" />
                    </div>
                    {/* 날짜 라벨 및 값 */}
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: '0.125rem' }}>날짜</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{formatDateDisplay()}</p>
                    </div>
                </div>
            </div>

            {/* ----------------------------------------
                섹션 3: 상품명 입력
                - 언더라인 스타일 입력 필드
            ---------------------------------------- */}
            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem'
                }}>상품명</label>
                <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="상품명을 입력하세요"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0',        // 좌우 패딩 없음 (라벨과 정렬)
                        fontSize: '1rem',
                        fontWeight: '500',
                        color: 'var(--text-main)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #e2e8f0',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* ----------------------------------------
                섹션 4: 소비처 입력
                - 언더라인 스타일 입력 필드
            ---------------------------------------- */}
            <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem'
                }}>소비처</label>
                <input
                    type="text"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="소비처를 입력하세요"
                    style={{
                        width: '100%',
                        padding: '0.5rem 0',        // 좌우 패딩 없음 (라벨과 정렬)
                        fontSize: '1rem',
                        fontWeight: '500',
                        color: 'var(--text-main)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #e2e8f0',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* ----------------------------------------
                섹션 5: 장소 검색
                - 지도 썸네일을 클릭해야만 카카오맵 장소 검색 모달이 열림
                - 오른쪽에 실제 미니맵 표시 (작은 썸네일 유지 + 실제 지도)
            ---------------------------------------- */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem'
                }}>장소 검색</label>

                {/* 장소명 + 미니맵 영역 - flex로 하단 정렬 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',  /* 하단 정렬 */
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}
                >
                    {/* 장소명 텍스트 영역 - 클릭해도 모달 안 열림 */}
                    <div style={{
                        flex: 1,
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: '0.5rem'
                    }}>
                        <span style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: location.placeName || location.address ? 'var(--text-main)' : '#a0aec0',
                            display: 'block',
                            lineHeight: '1.5',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {location.placeName || location.address || '장소를 검색하세요'}
                        </span>
                    </div>

                    {/* 미니맵 영역 - 클릭 시에만 모달 열림 */}
                    <div
                        onClick={() => setShowLocationPicker(true)}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            position: 'relative',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f1f5f9'
                        }}
                    >
                        {/* 실제 미니맵 또는 기본 아이콘 */}
                        {location.lat && location.lng ? (
                            <img
                                src={`https://dapi.kakao.com/v2/local/map/staticmap.png?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&center=${location.lng},${location.lat}&level=3&w=96&h=96&marker=color:red|pos:${location.lng},${location.lat}`}
                                alt="위치 미리보기"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                                onError={(e) => {
                                    // 이미지 로드 실패 시 기본 아이콘 표시
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        {/* 기본 아이콘 (좌표 없을 때 또는 이미지 로드 실패 시) */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#e0f2f1',
                            display: location.lat && location.lng ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}>
                            <MapPin size={24} color="var(--primary)" />
                        </div>
                    </div>
                </div>

                {/* 안내 텍스트 */}
                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-sub)',
                    marginTop: '0.5rem'
                }}>썸네일을 누르면 지도를 크게 볼 수 있습니다.</p>
            </div>

            {/* ----------------------------------------
                섹션 6: 고정 지출 토글
                - 매월 반복되는 고정 지출로 등록할지 여부
            ---------------------------------------- */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                marginBottom: '1rem'
            }}>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>고정 지출에 추가</span>
                {/* 토글 스위치 */}
                <div
                    onClick={() => setIsRecurring(!isRecurring)}
                    style={{
                        width: '50px',
                        height: '28px',
                        backgroundColor: isRecurring ? 'var(--primary)' : '#cbd5e0',
                        borderRadius: '14px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                    }}
                >
                    {/* 토글 원형 버튼 */}
                    <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: isRecurring ? '24px' : '2px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}></div>
                </div>
            </div>

            {/* ----------------------------------------
                섹션 7: 저장 버튼
                - 클릭 시 onSave 콜백 호출하여 데이터 저장
            ---------------------------------------- */}
            <button
                onClick={() => onSave({
                    amount,
                    category,
                    item,
                    store,
                    date: rawDate.toISOString(),
                    is_fixed: isRecurring,
                    address: location.placeName && location.address
                        ? `${location.placeName} | ${location.address}`
                        : (location.placeName || location.address)
                })}
                style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(47, 133, 90, 0.2)'
                }}
            >
                저장
            </button>

            {/* ========================================
                모달 컴포넌트들
                - 각 모달은 해당 상태가 true일 때 표시됨
            ======================================== */}

            {/* 금액 계산기 모달 */}
            <CalculatorInput
                isOpen={showCalculator}
                onClose={() => setShowCalculator(false)}
                initialValue={amount}
                onConfirm={(newAmount) => setAmount(newAmount)}
            />

            {/* 날짜 휠 선택 모달 */}
            <DateWheelPicker
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                initialDate={rawDate}
                onConfirm={(newDate) => setRawDate(newDate)}
            />

            {/* 카카오맵 장소 검색 모달 */}
            <KakaoLocationPicker
                isOpen={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                onConfirm={(newLocation) => setLocation(newLocation)}
                initialAddress={location.address}
                initialPlaceName={location.address && store ? `${location.address} ${store}` : (store || location.address)}
            />

            {/* 카테고리 선택 모달 (바텀시트 형태) */}
            {showCategoryPicker && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        zIndex: 2000,
                    }}
                    onClick={() => setShowCategoryPicker(false)}
                >
                    {/* 카테고리 선택 패널 */}
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            padding: '20px',
                            width: '100%',
                            maxWidth: '430px',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>카테고리 선택</span>
                            <button
                                onClick={() => setShowCategoryPicker(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 카테고리 목록 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {CATEGORIES.map((cat) => (
                                <div
                                    key={cat}
                                    onClick={() => {
                                        setCategory(cat);
                                        setShowCategoryPicker(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        backgroundColor: category === cat ? '#e6fffa' : '#f8f9fa',
                                        cursor: 'pointer',
                                        border: category === cat ? '2px solid var(--primary)' : '2px solid transparent',
                                    }}
                                >
                                    {getCategoryIcon(cat, 20)}
                                    <span style={{
                                        fontWeight: category === cat ? '600' : '400',
                                        color: 'var(--text-main)'
                                    }}>{cat}</span>
                                    {/* 선택된 카테고리에 체크 표시 */}
                                    {category === cat && (
                                        <Check size={18} color="var(--primary)" style={{ marginLeft: 'auto' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 애니메이션 스타일 정의 */}
            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
