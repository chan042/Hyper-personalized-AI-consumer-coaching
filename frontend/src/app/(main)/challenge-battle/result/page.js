"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";


function LegacyBattleResultPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const battleId = searchParams.get("battleId");
        if (battleId) {
            router.replace(`/challenge-battle/result2?battleId=${battleId}`);
            return;
        }

        router.replace("/challenge-battle/search?screen=intro");
    }, [router, searchParams]);

    return null;
}

export default function LegacyBattleResultPage() {
    return (
        <Suspense fallback={null}>
            <LegacyBattleResultPageContent />
        </Suspense>
    );
}
