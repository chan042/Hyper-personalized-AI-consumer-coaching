/**
 * [파일 역할]
 * - 인증 페이지(로그인, 회원가입)의 공통 레이아웃을 정의합니다.
 * - 메인 앱과 다른 심플한 디자인을 적용합니다.
 */

export default function AuthLayout({ children }) {
    return (
        <div style={{
            backgroundColor: '#e0e0e0',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--background-light)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden'
            }}>
                {children}
            </div>
        </div>
    );
}
