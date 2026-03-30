"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, RefreshCw, Search } from 'lucide-react';

import {
    acceptBattleRequest,
    cancelBattleRequest,
    createBattleRequest,
    getBattleProfile,
    getBattleEntry,
    issueBattleCode,
    lookupBattleUser,
    rejectBattleRequest,
} from '@/lib/api/battle';

const categories = [
    { id: 'alternative', label: '대안 행동 실현도' },
    { id: 'growth', label: '성장' },
    { id: 'health', label: '건강 점수' },
    { id: 'challenge', label: '챌린지' },
];

const DEFAULT_CHARACTER_TYPE = 'char_cat';

function getCharacterImagePath(characterType, imageName = 'face_basic') {
    const normalizedCharacterType = String(characterType || DEFAULT_CHARACTER_TYPE).trim().toLowerCase();
    const resolvedCharacterType = normalizedCharacterType.startsWith('char_')
        ? normalizedCharacterType
        : `char_${normalizedCharacterType || 'cat'}`;
    const resolvedImageName = String(imageName || 'face_basic').replace(/\.png$/i, '');

    return `/images/characters/${resolvedCharacterType}/${resolvedImageName}.png`;
}

const guideSlides = [
    {
        number: '1',
        title: '진행 방식',
        desc: "• 윤택지수 대결은 1:1 대결이에요.\n• 대결을 신청하고 상대방이 수락하면 시작할 수 있어요.",
        imageName: 'face_basic',
    },
    {
        number: '2',
        title: '시작 가능 기간',
        desc: "• 대결 신청은 매월 1일~15일까지만 가능해요.\n• 시작된 대결은 월말 윤택지수 결과가 나오기 전까지 진행돼요.",
        imageName: 'face_surprise',
    },
    {
        number: '3',
        title: '대결 규칙',
        desc: "• 4개의 대결 항목 중 하나를 고르고 3개의 미션에 도전해요.\n• 하나의 미션을 성공할 때마다 +3점을 받아요.\n• 총 대결 결과는 기존 점수 + 보너스 점수로 결정돼요.",
        imageName: 'face_happy',
    },
    {
        number: '4',
        title: '대안 행동 실현도 미션',
        desc: "• 대안 행동 실현도는 사용자가 설정한 월 예산을 잘 준수하였는지 평가하는 항목이에요.\n• 하단 코칭 탭에서 AI 코칭 카드를 챌린지로 만들고 상대보다 먼저 성공해봐요!",
        imageName: 'face_money',
    },
    {
        number: '5',
        title: '성장 미션',
        desc: "• 성장 소비는 스스로의 자기계발과 성장에 대한 지출을 하였는지 평가하는 항목이에요.",
        imageName: 'face_happy',
    },
    {
        number: '6',
        title: '건강 점수 미션',
        desc: "• 지출 카테고리를 분석해서 사용자가 얼마나 건강한 음식, 생활을 하였는지 평가하는 항목이에요.\n• 미션 중 무지출 미션이 있어요. 해당 미션은 윤택지수 대결이 시작한 날 기준 다음 날 00시부터 자동으로 시작돼요!",
        imageName: 'face_basic',
    },
    {
        number: '7',
        title: '챌린지 미션',
        desc: "• 챌린지를 통해 소비를 줄이는 경험을 늘리기 위한 항목이에요.\n• 하단 챌린지 탭에서 챌린지를 시작하고 상대보다 먼저 성공해봐요!",
        imageName: 'fly',
    },
    {
        number: '8',
        title: '점수 반영 안내',
        desc: "• 대결 보너스 점수는 결과에만 쓰이며 실제 윤택지수 리포트 점수엔 포함되지 않아요.\n• 대결에서 최종 승리하면 500P를 받아요!\n• 무승부일 경우 두명의 사용자 모두 500P를 받아요.",
        imageName: 'fly',
    },
];

const REQUEST_SCREEN_REFRESH_MS = 1500;

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date(value));

        const readPart = (type) => parts.find((part) => part.type === type)?.value || '';
        const month = readPart('month');
        const day = readPart('day');
        const hour24 = Number(readPart('hour'));
        const minute = readPart('minute');
        const meridiem = hour24 >= 12 ? '오후' : '오전';
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

        return `${month}. ${day}. ${meridiem} ${hour12}:${minute}`;
    } catch {
        return value;
    }
}

function BattleSearchPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [currentGuideSlide, setCurrentGuideSlide] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedUsers, setSearchedUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState('');
    const [searchError, setSearchError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isIssuingCode, setIsIssuingCode] = useState(false);
    const [isSubmittingBattle, setIsSubmittingBattle] = useState(false);
    const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    const currentScreen = searchParams.get('screen') || 'intro';
    const previewCharacterType = searchParams.get('opponentCharacterType') || DEFAULT_CHARACTER_TYPE;
    const previewProfile = {
        name: searchParams.get('opponentName') || '',
        id: searchParams.get('opponentBattleCode') || '',
        image: getCharacterImagePath(previewCharacterType),
    };
    const previewDisplayName = previewProfile.name
        ? (previewProfile.name.endsWith('님') ? previewProfile.name : `${previewProfile.name}님`)
        : '';
    const previewCategory = categories.find((item) => item.id === searchParams.get('category'))?.label || '';
    const requestDeadlineAt = searchParams.get('requestDeadlineAt') || '';
    const currentBattleId = searchParams.get('battleId') || '';

    useEffect(() => {
        let cancelled = false;

        async function loadBattleProfile() {
            try {
                setProfileLoading(true);
                setProfileError('');
                const data = await getBattleProfile();
                if (!cancelled) {
                    setProfile(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setProfileError(
                        error?.response?.data?.detail ||
                        '배틀 프로필을 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setProfileLoading(false);
                }
            }
        }

        loadBattleProfile();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const shouldResetSelectionState =
            currentScreen === 'intro' ||
            (currentScreen === 'selection' && !currentBattleId);

        if (!shouldResetSelectionState) {
            return;
        }

        setSearchQuery('');
        setSearchedUsers([]);
        setSelectedUserId(null);
        setSelectedCategory(null);
        setSearchError('');
    }, [currentBattleId, currentScreen]);

    const moveToScreen = (screen, options = {}) => {
        const {
            battleId,
            name,
            id,
            category,
            requestDeadlineAt,
            opponentCharacterType,
            clearPreview = false,
            resetGuide = false,
        } = options;
        const params = new URLSearchParams(searchParams.toString());

        params.set('screen', screen);

        if (clearPreview) {
            params.delete('opponentName');
            params.delete('opponentBattleCode');
            params.delete('battleId');
            params.delete('category');
            params.delete('requestDeadlineAt');
            params.delete('opponentCharacterType');
        }

        if (name) {
            params.set('opponentName', name);
        }

        if (id) {
            params.set('opponentBattleCode', id);
        }

        if (battleId) {
            params.set('battleId', String(battleId));
        }

        if (category) {
            params.set('category', category);
        }

        if (requestDeadlineAt) {
            params.set('requestDeadlineAt', requestDeadlineAt);
        }

        if (opponentCharacterType) {
            params.set('opponentCharacterType', opponentCharacterType);
        }

        if (resetGuide) {
            setCurrentGuideSlide(0);
        }

        router.replace(`/challenge-battle/search?${params.toString()}`);
    };

    const moveByBattleEntry = (entry) => {
        if (entry?.next_screen === 'progress') {
            router.replace('/challenge-battle/progress');
            return;
        }

        if (entry?.next_screen === 'result') {
            const resultUrl = entry.battle_id
                ? `/challenge-battle/result2?battleId=${entry.battle_id}`
                : '/challenge-battle/result2';
            router.replace(resultUrl);
            return;
        }

        if (entry?.next_screen === 'search' && entry?.view_mode) {
            moveToScreen(entry.view_mode, {
                battleId: entry.battle_id,
                name: entry.opponent_display_name,
                id: entry.opponent_battle_code,
                category: entry.category,
                requestDeadlineAt: entry.request_deadline_at,
                opponentCharacterType: entry.opponent_character_type,
            });
            return;
        }

        moveToScreen('intro', { clearPreview: true });
    };

    useEffect(() => {
        const isGuideScreen = currentScreen === 'guide';
        if (isGuideScreen) {
            return;
        }

        const isPendingScreen = currentScreen === 'request_pending' || currentScreen === 'request_received';
        let cancelled = false;

        async function syncBattleEntryScreen() {
            try {
                const entry = await getBattleEntry();
                if (cancelled) {
                    return;
                }

                if (isPendingScreen) {
                    const isSamePendingScreen =
                        entry?.next_screen === 'search' &&
                        entry?.view_mode === currentScreen &&
                        String(entry?.battle_id || '') === currentBattleId;

                    if (!isSamePendingScreen) {
                        moveByBattleEntry(entry);
                    }
                    return;
                }

                const hasBattleTransition =
                    entry?.next_screen === 'progress' ||
                    entry?.next_screen === 'result' ||
                    (entry?.next_screen === 'search' && entry?.view_mode);

                if (hasBattleTransition) {
                    moveByBattleEntry(entry);
                }
            } catch {
                // Ignore and keep the current screen; action handlers still surface request errors.
            }
        }

        syncBattleEntryScreen();

        const intervalId = window.setInterval(syncBattleEntryScreen, REQUEST_SCREEN_REFRESH_MS);
        const handleFocus = () => syncBattleEntryScreen();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                syncBattleEntryScreen();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentBattleId, currentScreen]);

    const handleSearch = async () => {
        const normalizedCode = searchQuery.trim().toUpperCase();
        if (!normalizedCode) {
            setSearchError('배틀 ID를 입력해주세요.');
            setSearchedUsers([]);
            setSelectedUserId(null);
            return;
        }

        try {
            setIsSearching(true);
            setSearchError('');
            const user = await lookupBattleUser(normalizedCode);
            setSearchedUsers([
                {
                    name: user.display_name,
                    id: user.battle_code,
                    characterType: user.character_type,
                },
            ]);
            setSelectedUserId(user.battle_code);
        } catch (error) {
            setSearchedUsers([]);
            setSelectedUserId(null);

            const responseData = error?.response?.data;
            if (responseData?.code === 'SELF_CHALLENGE_NOT_ALLOWED') {
                setSearchError('내 배틀 ID로는 대결할 수 없어요.');
            } else if (error?.response?.status === 404) {
                setSearchError('입력한 배틀 ID를 찾지 못했어요.');
            } else {
                setSearchError(responseData?.detail || '검색 중 오류가 발생했어요.');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleApplyBattle = async () => {
        if (searchedUsers.length === 0 || !selectedUserId) {
            alert('먼저 대결할 친구를 검색하고 선택해주세요.');
            return;
        }

        if (!selectedCategory) {
            alert('대결할 항목을 선택해주세요.');
            return;
        }

        try {
            setIsSubmittingBattle(true);
            setSearchError('');

            const entry = await createBattleRequest({
                opponent_battle_code: selectedUserId,
                category: selectedCategory,
            });
            moveByBattleEntry(entry);
        } catch (error) {
            const responseData = error?.response?.data;
            setSearchError(
                responseData?.detail ||
                responseData?.code ||
                '대결 신청 중 오류가 발생했어요.'
            );
        } finally {
            setIsSubmittingBattle(false);
        }
    };

    const handleIssueCode = async () => {
        try {
            setIsIssuingCode(true);
            setProfileError('');
            const updated = await issueBattleCode();
            setProfile(updated);
            setCopiedCode(false);
        } catch (error) {
            setProfileError(
                error?.response?.data?.detail ||
                '배틀 ID 재생성에 실패했습니다.'
            );
        } finally {
            setIsIssuingCode(false);
        }
    };

    const handleCopyBattleCode = async () => {
        if (!profile?.battle_code || !navigator?.clipboard) {
            return;
        }

        try {
            await navigator.clipboard.writeText(profile.battle_code);
            setCopiedCode(true);
            window.setTimeout(() => setCopiedCode(false), 1500);
        } catch {
            setCopiedCode(false);
        }
    };

    const handleRequestAction = async (action) => {
        const battleId = searchParams.get('battleId');
        if (!battleId) {
            setProfileError('대결 정보를 찾지 못했습니다.');
            return;
        }

        try {
            setIsUpdatingRequest(true);
            setProfileError('');

            let entry;
            if (action === 'accept') {
                entry = await acceptBattleRequest(battleId);
            } else if (action === 'reject') {
                entry = await rejectBattleRequest(battleId);
            } else if (action === 'cancel') {
                entry = await cancelBattleRequest(battleId);
            } else {
                entry = await getBattleEntry();
            }

            moveByBattleEntry(entry);
        } catch (error) {
            const responseData = error?.response?.data;
            setProfileError(
                responseData?.detail ||
                responseData?.code ||
                '대결 요청 처리 중 오류가 발생했어요.'
            );
        } finally {
            setIsUpdatingRequest(false);
        }
    };

    const animationStyles = (
        <style jsx global>{`
            @keyframes battleFloat {
                0%, 100% {
                    transform: translateY(0px);
                }
                50% {
                    transform: translateY(-10px);
                }
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(12px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `}</style>
    );

    if (currentScreen === 'intro') {
        return (
            <>
                <div style={{ ...styles.container, overflow: 'hidden' }}>
                    <div style={styles.introContent}>
                        <h2 style={styles.introTitle}>
                            친구와 함께
                            <br />
                            윤택지수 대결을 하고
                            <br />
                            포인트를 얻어봐요.
                        </h2>
                    </div>
                    <div style={styles.introBottom}>
                        <button
                            type="button"
                            style={styles.introTextBtn}
                            onClick={() => moveToScreen('selection', { clearPreview: true })}
                        >
                            괜찮아요
                        </button>
                        <button
                            type="button"
                            style={styles.introPrimaryBtn}
                            onClick={() => moveToScreen('guide', { clearPreview: true, resetGuide: true })}
                        >
                            설명보기
                        </button>
                    </div>
                </div>
                {animationStyles}
            </>
        );
    }

    if (currentScreen === 'guide') {
        const slide = guideSlides[currentGuideSlide];
        const guideImage = getCharacterImagePath(profile?.character_type, slide.imageName);

        return (
            <>
                <div style={{ ...styles.container, overflow: 'hidden' }}>
                    <div style={styles.segmentedProgressContainer}>
                        {guideSlides.map((_, index) => (
                            <div key={index} style={styles.segmentBackground}>
                                <div
                                    style={{
                                        ...styles.segmentFill,
                                        width: index <= currentGuideSlide ? '100%' : '0%',
                                        transition: 'width 0.3s ease',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={styles.guideContent}>
                        <h2 style={styles.tossTitle}>{slide.title}</h2>
                        <div style={styles.tossDesc}>
                            {slide.desc.split('\n').map((line, index) => (
                                <p key={`${line}-${index}`} style={{ margin: '0.4rem 0' }}>
                                    {line}
                                </p>
                            ))}
                        </div>

                        <div style={styles.guideImageFixedContainer}>
                            <img src={guideImage} alt="Step visual" style={styles.guideImage} />
                        </div>
                    </div>

                    <div style={styles.guideFloatingBottom}>
                        <div style={styles.guideBottomControls}>
                            {currentGuideSlide > 0 ? (
                                <button
                                    type="button"
                                    style={styles.tossPrevBtn}
                                    onClick={() => setCurrentGuideSlide((prev) => prev - 1)}
                                >
                                    이전
                                </button>
                            ) : (
                                <div style={{ width: '80px' }} />
                            )}

                            {currentGuideSlide < guideSlides.length - 1 ? (
                                <button
                                    type="button"
                                    style={styles.tossNextBtn}
                                    onClick={() => setCurrentGuideSlide((prev) => prev + 1)}
                                >
                                    다음
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    style={styles.tossNextBtn}
                                    onClick={() => moveToScreen('selection', { clearPreview: true })}
                                >
                                    대결 시작
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {animationStyles}
            </>
        );
    }

    if (currentScreen === 'request_pending' || currentScreen === 'request_received') {
        const isReceivedScreen = currentScreen === 'request_received';
        const isPendingPreviewReady = Boolean(currentBattleId);

        if (!isPendingPreviewReady) {
            return (
                <>
                    <div style={{ ...styles.container, overflow: 'hidden' }}>
                        <div style={styles.previewContent}>
                            <span style={styles.previewBadge}>
                                {isReceivedScreen ? '받은 신청' : '신청 완료'}
                            </span>
                            <div style={styles.previewTitleBlock}>
                                <p style={styles.previewSubtitle}>대결 정보를 불러오는 중이에요.</p>
                            </div>
                        </div>
                    </div>
                    {animationStyles}
                </>
            );
        }

        return (
            <>
                <div style={{ ...styles.container, overflow: 'hidden' }}>
                    <div style={styles.previewContent}>
                        <span style={styles.previewBadge}>
                            {isReceivedScreen ? '받은 신청' : '신청 완료'}
                        </span>

                        <div style={styles.previewTitleBlock}>
                            <div style={styles.previewTitleLine}>
                                <span style={styles.previewTitleName}>{previewDisplayName || '상대방님'}</span>
                                <span style={styles.previewTitleText}>
                                    {isReceivedScreen
                                        ? '이 윤택지수 대결을 신청했어요.'
                                        : '에게 윤택지수 대결을 신청했어요.'}
                                </span>
                            </div>
                            <p style={styles.previewSubtitle}>
                                {isReceivedScreen
                                    ? '승낙해 대결을 시작해보세요.'
                                    : '상대의 응답을 기다리는 중이에요.'}
                            </p>
                        </div>

                        <div style={styles.previewProfileCard}>
                            <div style={styles.previewProfileImageWrap}>
                                <img
                                    src={previewProfile.image}
                                    alt={`${previewProfile.name} 프로필`}
                                    style={styles.previewProfileImage}
                                />
                            </div>
                            <div style={styles.previewProfileText}>
                                <span style={styles.previewProfileLabel}>
                                    {isReceivedScreen ? '신청한 사용자' : '대결 상대'}
                                </span>
                                <strong style={styles.previewProfileName}>{previewProfile.name || '상대방'}</strong>
                                {previewProfile.id && (
                                    <span style={styles.previewProfileId}>배틀 ID: {previewProfile.id}</span>
                                )}
                                {previewCategory && (
                                    <span style={styles.previewProfileId}>항목: {previewCategory}</span>
                                )}
                                {requestDeadlineAt && (
                                    <span style={styles.previewProfileId}>응답 마감: {formatDateTime(requestDeadlineAt)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {profileError && <p style={{ ...styles.inlineError, marginTop: '0.5rem' }}>{profileError}</p>}

                    <div style={styles.introBottom}>
                        {isReceivedScreen && (
                            <button
                                type="button"
                                style={styles.introTextBtn}
                                onClick={() => handleRequestAction('reject')}
                                disabled={isUpdatingRequest}
                            >
                                거절하기
                            </button>
                        )}
                        <button
                            type="button"
                            style={styles.introPrimaryBtn}
                            onClick={() => handleRequestAction(isReceivedScreen ? 'accept' : 'cancel')}
                            disabled={isUpdatingRequest}
                        >
                            {isUpdatingRequest
                                ? '처리 중...'
                                : (isReceivedScreen ? '승낙하기' : '취소하기')}
                        </button>
                    </div>
                </div>
                {animationStyles}
            </>
        );
    }

    return (
        <>
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.battleCodeCard}>
                        <div>
                            <span style={styles.battleCodeLabel}>나의 배틀 ID</span>
                            <div style={styles.battleCodeValue}>
                                {profileLoading ? '불러오는 중...' : (profile?.battle_code || '-')}
                            </div>
                            {copiedCode && <div style={styles.copySuccessText}>복사 완료</div>}
                        </div>
                        <div style={styles.battleCodeActions}>
                            <button
                                type="button"
                                style={styles.battleCodeIconButton}
                                onClick={handleCopyBattleCode}
                                disabled={!profile?.battle_code}
                                title="배틀 ID 복사"
                            >
                                <Copy size={16} />
                            </button>
                            <button
                                type="button"
                                style={styles.battleCodeIconButton}
                                onClick={handleIssueCode}
                                disabled={isIssuingCode}
                                title="배틀 ID 재생성"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {profileError && <p style={styles.inlineError}>{profileError}</p>}

                    <h2 style={styles.mainInstructionLine}>대결 상대를 검색해 선택해주세요.</h2>

                    <div style={styles.searchSection}>
                        <div style={styles.searchBar}>
                            <Search size={20} color="var(--text-guide)" style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="상대의 배틀 ID 검색"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value.toUpperCase())}
                                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                                style={styles.searchInput}
                            />
                            <button type="button" onClick={handleSearch} style={styles.searchButton}>
                                {isSearching ? '검색중' : '검색'}
                            </button>
                        </div>

                        {searchError && <p style={styles.inlineError}>{searchError}</p>}

                        {searchedUsers.length > 0 && (
                            <div style={styles.userList}>
                                {searchedUsers.map((user) => {
                                    const isSelected = selectedUserId === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            style={{
                                                ...styles.userCard,
                                                borderColor: isSelected ? 'var(--primary)' : 'transparent',
                                                backgroundColor: isSelected ? '#f0fdfa' : 'white',
                                            }}
                                        >
                                            <div style={styles.userInfo}>
                                                <div style={styles.userIconWrapper}>
                                                    <img
                                                        src={getCharacterImagePath(user.characterType)}
                                                        alt={`${user.name} 캐릭터`}
                                                        style={styles.userCharacterImage}
                                                    />
                                                </div>
                                                <div style={styles.userDetails}>
                                                    <span style={styles.userName}>{user.name}</span>
                                                    <span style={styles.userMeta}>배틀 ID: {user.id}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                style={{
                                                    ...styles.selectButton,
                                                    ...(isSelected ? styles.selectButtonActive : {}),
                                                }}
                                                onClick={() =>
                                                    setSelectedUserId((prev) => (prev === user.id ? null : user.id))
                                                }
                                            >
                                                {isSelected ? '선택됨' : '선택'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            ...styles.categorySection,
                            ...(!selectedUserId ? styles.blurredSection : {}),
                        }}
                    >
                        <h2 style={styles.mainInstructionLine}>대결 항목 선택해주세요.</h2>
                        <div style={styles.categoryGrid}>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    style={{
                                        ...styles.categoryButton,
                                        ...(selectedCategory === category.id
                                            ? styles.categoryButtonSelected
                                            : {}),
                                    }}
                                    onClick={() =>
                                        setSelectedCategory((prev) =>
                                            prev === category.id ? null : category.id
                                        )
                                    }
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={styles.bottomFixedArea}>
                    <button
                        type="button"
                        style={{
                            ...styles.applyButton,
                            background:
                                !selectedUserId || !selectedCategory || isSubmittingBattle ? '#cbd5e1' : 'var(--primary)',
                            boxShadow:
                                !selectedUserId || !selectedCategory || isSubmittingBattle
                                    ? 'none'
                                    : '0 4px 12px rgba(20, 184, 166, 0.3)',
                        }}
                        onClick={handleApplyBattle}
                        disabled={!selectedUserId || !selectedCategory || isSubmittingBattle}
                    >
                        {isSubmittingBattle ? '신청 중...' : '대결 신청'}
                    </button>
                </div>
            </div>
            {animationStyles}
        </>
    );
}

export default function BattleSearchPage() {
    return (
        <Suspense fallback={<div style={{ padding: '24px' }}>로딩 중...</div>}>
            <BattleSearchPageContent />
        </Suspense>
    );
}

const styles = {
    container: {
        background: 'var(--background-light, #f1f5f9)',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        paddingTop: '1.5rem',
        paddingRight: '1.5rem',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: '1.5rem',
    },
    mainInstructionLine: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '1.5rem',
        marginTop: '0.5rem',
        lineHeight: 1.4,
    },
    battleCodeCard: {
        background: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
    },
    battleCodeLabel: {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: '700',
        color: 'var(--text-guide)',
        marginBottom: '0.35rem',
    },
    battleCodeValue: {
        fontSize: '1.15rem',
        fontWeight: '800',
        color: 'var(--text-main)',
        letterSpacing: '0.08em',
    },
    battleCodeActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    battleCodeIconButton: {
        width: '36px',
        height: '36px',
        borderRadius: '999px',
        border: '1px solid #e2e8f0',
        background: 'white',
        color: 'var(--text-sub)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    copySuccessText: {
        marginTop: '0.3rem',
        fontSize: '0.78rem',
        fontWeight: '700',
        color: 'var(--primary)',
    },
    inlineError: {
        margin: '0 0 1rem',
        fontSize: '0.88rem',
        fontWeight: '600',
        color: '#ef4444',
    },
    introContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        paddingTop: '1.5rem',
        paddingRight: '2rem',
        paddingBottom: '1.5rem',
        paddingLeft: '2rem',
        textAlign: 'left',
    },
    introTitle: {
        fontSize: '1.8rem',
        fontWeight: '800',
        lineHeight: 1.4,
        marginTop: '1rem',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.1))',
    },
    previewContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        paddingTop: '1.5rem',
        paddingRight: '1.5rem',
        paddingBottom: '1.5rem',
        paddingLeft: '1.5rem',
        gap: '1.1rem',
    },
    previewBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.45rem 0.85rem',
        borderRadius: '999px',
        background: 'rgba(16, 185, 129, 0.12)',
        color: 'var(--primary)',
        fontSize: '0.8rem',
        fontWeight: '700',
        marginTop: '0.5rem',
    },
    previewTabs: {
        display: 'flex',
        gap: '0.5rem',
        width: '100%',
        marginTop: '0.5rem',
    },
    previewTab: {
        flex: 1,
        border: 'none',
        borderRadius: '999px',
        padding: '0.7rem 0.9rem',
        background: 'rgba(148, 163, 184, 0.12)',
        color: 'var(--text-sub)',
        fontSize: '0.85rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    previewTabActive: {
        background: 'rgba(16, 185, 129, 0.14)',
        color: 'var(--primary)',
    },
    previewTitleBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
    },
    previewTitleLine: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: '0.2rem',
        lineHeight: 1.25,
    },
    previewTitleName: {
        fontSize: '2.1rem',
        fontWeight: '900',
        letterSpacing: '-0.04em',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.1))',
    },
    previewTitleText: {
        fontSize: '1.1rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        paddingBottom: '0.18rem',
    },
    previewSubtitle: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-sub)',
        lineHeight: 1.5,
    },
    previewProfileCard: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'linear-gradient(145deg, #ffffff, #f8fffd)',
        borderRadius: '24px',
        padding: '1.1rem 1.2rem',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
        animation: 'battleFloat 3.2s ease-in-out infinite',
    },
    previewProfileImageWrap: {
        width: '72px',
        height: '72px',
        borderRadius: '22px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.18))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)',
    },
    previewProfileImage: {
        width: '60px',
        height: '60px',
        objectFit: 'contain',
    },
    previewProfileText: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
    },
    previewProfileLabel: {
        fontSize: '0.78rem',
        fontWeight: '700',
        color: 'var(--text-guide)',
    },
    previewProfileName: {
        fontSize: '1.15rem',
        color: 'var(--text-main)',
    },
    previewProfileId: {
        fontSize: '0.9rem',
        color: 'var(--text-sub)',
    },
    introBottom: {
        position: 'fixed',
        bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        left: '0',
        right: '0',
        margin: '0 auto',
        width: '100%',
        maxWidth: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 100,
    },
    introPrimaryBtn: {
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        padding: '1.2rem',
        borderRadius: '16px',
        fontSize: '1.05rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)',
    },
    introTextBtn: {
        background: 'transparent',
        color: 'var(--text-sub)',
        border: 'none',
        padding: '0.8rem',
        fontSize: '0.95rem',
        fontWeight: '500',
        cursor: 'pointer',
        textAlign: 'center',
    },
    segmentedProgressContainer: {
        display: 'flex',
        gap: '4px',
        padding: '0.5rem 1.5rem',
    },
    segmentBackground: {
        flex: 1,
        height: '4px',
        background: '#e2e8f0',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    segmentFill: {
        height: '100%',
        background: 'var(--primary)',
        width: '0%',
    },
    guideContent: {
        flex: 1,
        paddingTop: '0',
        paddingRight: '1.5rem',
        paddingBottom: '0',
        paddingLeft: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
    },
    guideImageFixedContainer: {
        width: '220px',
        height: '220px',
        marginTop: 'auto',
        marginBottom: '25rem',
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        animation: 'fadeInUp 0.5s ease-out forwards',
    },
    tossTitle: {
        fontSize: '1.8rem',
        fontWeight: '800',
        color: '#1a1a1a',
        marginTop: '1.5rem',
        marginBottom: '1.5rem',
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        animation: 'fadeIn 0.3s ease-out forwards',
    },
    tossDesc: {
        fontSize: '1rem',
        color: '#1a1a1a',
        lineHeight: 1.6,
        fontWeight: '500',
        textAlign: 'left',
        width: '100%',
        animation: 'fadeIn 0.4s ease-out forwards',
    },
    guideFloatingBottom: {
        position: 'fixed',
        bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
        left: '0',
        right: '0',
        margin: '0 auto',
        maxWidth: '480px',
        padding: '0 2.5rem',
        zIndex: 100,
    },
    guideBottomControls: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tossPrevBtn: {
        background: 'var(--background-light, #f1f5f9)',
        color: 'var(--text-sub)',
        border: 'none',
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    tossNextBtn: {
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)',
    },
    searchSection: {
        marginBottom: '2rem',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem 0.5rem 0.5rem 1rem',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '1rem',
    },
    searchIcon: {
        marginRight: '0.5rem',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '0.95rem',
        color: 'var(--text-main)',
        background: 'transparent',
    },
    searchButton: {
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '0.9rem',
        cursor: 'pointer',
    },
    userList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    userCard: {
        background: 'white',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        animation: 'fadeInUp 0.3s ease-out forwards',
        border: '1px solid transparent',
        transition: 'all 0.2s ease',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    userIconWrapper: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    userCharacterImage: {
        width: '36px',
        height: '36px',
        objectFit: 'contain',
    },
    userDetails: {
        display: 'flex',
        flexDirection: 'column',
    },
    userName: {
        fontSize: '1.05rem',
        fontWeight: '600',
        color: 'var(--text-main)',
    },
    userMeta: {
        fontSize: '0.85rem',
        color: 'var(--text-guide)',
    },
    selectButton: {
        background: 'white',
        color: 'var(--text-sub)',
        border: '1px solid #cbd5e1',
        padding: '6px 12px',
        borderRadius: '16px',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    selectButtonActive: {
        background: 'var(--primary)',
        color: 'white',
        border: '1px solid var(--primary)',
    },
    categorySection: {
        marginTop: '1.5rem',
        marginBottom: '2rem',
        transition: 'all 0.3s ease',
    },
    categoryGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
    },
    categoryButton: {
        width: '100%',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        background: 'white',
        color: '#1a1a1a',
        fontSize: '1.05rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    },
    categoryButtonSelected: {
        background: '#f0fdfa',
        border: '1px solid var(--primary)',
        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.1)',
        color: 'var(--primary)',
    },
    bottomFixedArea: {
        position: 'fixed',
        bottom: 'calc(95px + env(safe-area-inset-bottom, 0px))',
        left: '0',
        right: '0',
        margin: '0 auto',
        width: '100%',
        maxWidth: '430px',
        padding: '0 1.5rem',
        zIndex: 100,
        transition: 'all 0.3s ease',
    },
    blurredSection: {
        filter: 'blur(4px)',
        opacity: 0.5,
        pointerEvents: 'none',
        userSelect: 'none',
    },
    applyButton: {
        width: '100%',
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
        transition: 'all 0.2s ease',
    },
};
