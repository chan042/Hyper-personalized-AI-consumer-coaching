"use client";

import { useEffect } from 'react';

let activeScrollLocks = 0;
let lockedScrollY = 0;

const lockBodyScroll = () => {
    if (typeof window === 'undefined') {
        return;
    }

    if (activeScrollLocks === 0) {
        lockedScrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
    }

    activeScrollLocks += 1;
};

const unlockBodyScroll = () => {
    if (typeof window === 'undefined' || activeScrollLocks === 0) {
        return;
    }

    activeScrollLocks -= 1;

    if (activeScrollLocks > 0) {
        return;
    }

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollY);
};

export default function BottomSheet({
    isOpen,
    onClose,
    children,
    header = null,
    footer = null,
    showHandle = true,
    closeOnBackdrop = true,
    zIndex = 1000,
    maxHeight = '90vh',
    backgroundColor = '#ffffff',
    padding = '1rem 1.5rem 1.5rem',
    scrollable = true,
    overlayStyle,
    sheetStyle,
    contentStyle,
}) {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        lockBodyScroll();
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            unlockBodyScroll();
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = () => {
        if (closeOnBackdrop) {
            onClose?.();
        }
    };

    return (
        <div
            style={{ ...sheetStyles.overlay, zIndex, ...overlayStyle }}
            onClick={handleBackdropClick}
        >
            <div
                style={{
                    ...sheetStyles.sheet,
                    maxHeight,
                    backgroundColor,
                    padding,
                    overflowY: scrollable ? 'auto' : 'visible',
                    overscrollBehavior: scrollable ? 'contain' : 'auto',
                    ...sheetStyle,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                {showHandle && <div style={sheetStyles.handle} />}
                {header ? <div style={sheetStyles.header}>{header}</div> : null}
                <div style={{ ...sheetStyles.content, ...contentStyle }}>
                    {children}
                </div>
                {footer ? <div style={sheetStyles.footer}>{footer}</div> : null}
            </div>
        </div>
    );
}

const sheetStyles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    sheet: {
        position: 'relative',
        width: '100%',
        maxWidth: '430px',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.12)',
        animation: 'sheet-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    handle: {
        width: '48px',
        height: '5px',
        backgroundColor: '#dbe3ea',
        borderRadius: '999px',
        margin: '0 auto 1rem',
    },
    header: {
        display: 'block',
    },
    content: {
        display: 'block',
    },
    footer: {
        marginTop: '1rem',
    },
};
