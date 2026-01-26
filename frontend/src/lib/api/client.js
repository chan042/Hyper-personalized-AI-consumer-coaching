import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:8000', // Backend URL
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

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(
                        'http://localhost:8000/api/users/token/refresh/',
                        { refresh: refreshToken }
                    );

                    const { access } = response.data;
                    localStorage.setItem('accessToken', access);

                    // 원래 요청 재시도
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return client(originalRequest);
                }
            } catch (refreshError) {
                // 토큰 갱신 실패 시 로그아웃 처리
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default client;
