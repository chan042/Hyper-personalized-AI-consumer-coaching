import ClientLayout from '@/components/common/ClientLayout';

export default function MainLayout({ children }) {
    return (
        <ClientLayout>
            {children}
        </ClientLayout>
    );
}
