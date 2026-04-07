"use client";

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

import { withLoadedKakaoMaps } from '../../lib/kakaoMaps';

export function MapPreviewPlaceholder() {
    return (
        <div style={styles.placeholderRoot} aria-hidden="true">
            <MapPin size={20} color="#53c5b5" strokeWidth={2.2} />
        </div>
    );
}

export default function KakaoStaticMapPreview({
    lat,
    lng,
    level = 3,
    marker = true,
}) {
    const containerRef = useRef(null);
    const [isRendered, setIsRendered] = useState(false);
    const [hasError, setHasError] = useState(false);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    useEffect(() => {
        if (!hasCoordinates || !containerRef.current) {
            setIsRendered(false);
            setHasError(false);
            return undefined;
        }

        let cancelled = false;
        setIsRendered(false);
        setHasError(false);

        withLoadedKakaoMaps((maps) => {
            if (cancelled || !containerRef.current) {
                return;
            }

            const position = new maps.LatLng(lat, lng);
            containerRef.current.innerHTML = '';

            new maps.StaticMap(containerRef.current, {
                center: position,
                level,
                marker: marker
                    ? { position }
                    : undefined,
            });

            setIsRendered(true);
        }).catch((error) => {
            if (cancelled) {
                return;
            }

            console.error('Kakao static map preview failed to render:', error);
            setHasError(true);
        });

        return () => {
            cancelled = true;

            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [hasCoordinates, lat, lng, level, marker]);

    return (
        <div style={styles.previewRoot}>
            <div
                ref={containerRef}
                style={{
                    ...styles.mapLayer,
                    display: isRendered && !hasError ? 'block' : 'none',
                }}
            />
            <div style={{ ...styles.fallbackLayer, display: isRendered && !hasError ? 'none' : 'block' }}>
                <MapPreviewPlaceholder />
            </div>
        </div>
    );
}

const styles = {
    previewRoot: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    mapLayer: {
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    fallbackLayer: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
    },
    placeholderRoot: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f7f0e4 0%, #f3ead9 100%)',
    },
};
