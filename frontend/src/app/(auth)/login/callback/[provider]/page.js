import { Suspense } from 'react';
import SocialLoginCallbackPage from '@/components/auth/SocialLoginCallbackPage';

export const dynamicParams = false;

export function generateStaticParams() {
    return [
        { provider: 'kakao' },
    ];
}

function CallbackFallback() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }} />
    );
}

export default async function Page({ params }) {
    const { provider } = await params;

    return (
        <Suspense fallback={<CallbackFallback />}>
            <SocialLoginCallbackPage provider={provider} />
        </Suspense>
    );
}
