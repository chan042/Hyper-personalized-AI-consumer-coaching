import axios from 'axios';

const LOCAL_DEV_FRONTEND_PORTS = new Set(['3000', '3001']);

function getLocalDevBaseURL() {
    if (typeof window === 'undefined') {
        return null;
    }

    const { protocol, hostname, port } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocalHost && LOCAL_DEV_FRONTEND_PORTS.has(port)) {
        return `${protocol}//${hostname}:8000`;
    }

    return null;
}

// 운영 앱은 NEXT_PUBLIC_API_URL을 우선 사용하고, 웹 로컬 개발에서만 localhost를 추론합니다.
export function getBaseURL() {
    const configuredBaseURL = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configuredBaseURL) {
        return configuredBaseURL;
    }

    const localDevBaseURL = getLocalDevBaseURL();
    if (localDevBaseURL) {
        return localDevBaseURL;
    }

    return 'http://localhost:8000';
}

const baseURL = getBaseURL();

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.log('[API Client] baseURL:', baseURL);
}

const client = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * 요청 인터셉터: 모든 API 요청에 JWT 토큰 자동 첨부
 */
client.interceptors.request.use(
    (config) => {
        // 브라우저 환경에서만 localStorage 접근
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * 응답 인터셉터: 401 에러 시 토큰 갱신 시도
 */
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 재시도하지 않은 요청인 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (typeof window !== 'undefined') {
                const refreshToken = localStorage.getItem('refreshToken');

                // refreshToken이 있는 경우에만 갱신 시도
                if (refreshToken) {
                    try {
                        const response = await axios.post(
                            `${baseURL}/api/users/token/refresh/`,
                            { refresh: refreshToken }
                        );

                        const { access } = response.data;
                        localStorage.setItem('accessToken', access);

                        // 원래 요청 재시도
                        originalRequest.headers.Authorization = `Bearer ${access}`;
                        return client(originalRequest);
                    } catch (refreshError) {
                        // 토큰 갱신 실패 시 토큰 삭제하고 에러 반환
                        // (컴포넌트에서 처리하도록 함)
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                } else {
                    // refreshToken이 없을 때 바로 로그인 화면으로
                    localStorage.removeItem('accessToken');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);


export default client;
