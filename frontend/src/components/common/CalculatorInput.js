"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const OPERATORS = ['-', '+', '×', '÷'];

const isOperator = (value) => OPERATORS.includes(value);

export default function CalculatorInput({ isOpen, onClose, initialValue = 0, onConfirm }) {
    const [expression, setExpression] = useState('0');
    const [selectionRange, setSelectionRange] = useState({ start: 1, end: 1 });
    const [isDisplayFocused, setIsDisplayFocused] = useState(false);
    const [caretMetrics, setCaretMetrics] = useState(null);
    const displayRef = useRef(null);
    const charRefs = useRef([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextExpression = initialValue > 0 ? String(initialValue) : '0';
        setExpression(nextExpression);
        setSelectionRange({
            start: nextExpression.length,
            end: nextExpression.length,
        });
        setIsDisplayFocused(false);
        setCaretMetrics(null);
    }, [isOpen, initialValue]);

    useLayoutEffect(() => {
        if (!isDisplayFocused || !displayRef.current) {
            setCaretMetrics(null);
            return;
        }

        const container = displayRef.current;
        const containerRect = container.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(container);
        const fontSize = parseFloat(computedStyle.fontSize) || 32;
        const nextCaretHeight = Math.round(fontSize * 1.08);
        const caretIndex = selectionRange.start === selectionRange.end
            ? selectionRange.start
            : selectionRange.end;

        let left = 0;
        let top = Math.max(0, (container.clientHeight - nextCaretHeight) / 2);
        let referenceRect = null;

        if (expression.length > 0) {
            if (caretIndex <= 0) {
                referenceRect = charRefs.current[0]?.getBoundingClientRect() || null;
                if (referenceRect) {
                    left = referenceRect.left - containerRect.left;
                }
            } else {
                const referenceIndex = Math.min(caretIndex - 1, expression.length - 1);
                referenceRect = charRefs.current[referenceIndex]?.getBoundingClientRect() || null;
                if (referenceRect) {
                    left = referenceRect.right - containerRect.left;
                }
            }
        }

        if (referenceRect) {
            top = referenceRect.top - containerRect.top + ((referenceRect.height - nextCaretHeight) / 2);
        }

        setCaretMetrics({
            left: Math.round(left),
            top: Math.round(top),
            height: nextCaretHeight,
        });
    }, [expression, isDisplayFocused, selectionRange]);

    if (!isOpen) return null;

    const commitExpression = (nextExpression, nextSelectionRange) => {
        const safeExpression = nextExpression && nextExpression.length > 0 ? nextExpression : '0';
        const maxIndex = safeExpression.length;
        const safeSelection = nextSelectionRange || { start: maxIndex, end: maxIndex };

        setExpression(safeExpression);
        setSelectionRange({
            start: Math.max(0, Math.min(safeSelection.start, maxIndex)),
            end: Math.max(0, Math.min(safeSelection.end, maxIndex)),
        });
    };

    const replaceSelection = (value) => {
        const { start, end } = selectionRange;

        if (/^\d+$/.test(value) && expression === '0') {
            if (value === '00') {
                commitExpression('0', { start: 1, end: 1 });
                return;
            }

            commitExpression(value, { start: value.length, end: value.length });
            return;
        }

        const nextExpression = `${expression.slice(0, start)}${value}${expression.slice(end)}`;
        const nextCursor = start + value.length;
        commitExpression(nextExpression, { start: nextCursor, end: nextCursor });
    };

    const handleNumberClick = (value) => {
        replaceSelection(value);
    };

    const handleBackspace = () => {
        const { start, end } = selectionRange;

        if (start !== end) {
            commitExpression(
                `${expression.slice(0, start)}${expression.slice(end)}`,
                { start, end: start }
            );
            return;
        }

        if (start === 0) {
            return;
        }

        commitExpression(
            `${expression.slice(0, start - 1)}${expression.slice(start)}`,
            { start: start - 1, end: start - 1 }
        );
    };

    const handleClear = () => {
        commitExpression('0', { start: 1, end: 1 });
    };

    const handleOperation = (operator) => {
        const { start, end } = selectionRange;

        if (start === end && start === 0) {
            return;
        }

        if (start !== end) {
            const before = expression.slice(0, start);
            const after = expression.slice(end);
            const safeBefore = before || '0';
            const nextCursor = safeBefore.length + 1;

            commitExpression(
                `${safeBefore}${operator}${after}`,
                { start: nextCursor, end: nextCursor }
            );
            return;
        }

        const previousChar = expression[start - 1];
        const nextChar = expression[start];

        if (isOperator(previousChar)) {
            commitExpression(
                `${expression.slice(0, start - 1)}${operator}${expression.slice(start)}`,
                { start, end: start }
            );
            return;
        }

        if (isOperator(nextChar)) {
            commitExpression(
                `${expression.slice(0, start)}${operator}${expression.slice(start + 1)}`,
                { start: start + 1, end: start + 1 }
            );
            return;
        }

        replaceSelection(operator);
    };

    const evaluateExpression = (value) => {
        try {
            let cleanExpression = value;

            while (isOperator(cleanExpression.slice(-1))) {
                cleanExpression = cleanExpression.slice(0, -1);
            }

            cleanExpression = cleanExpression.replace(/^[+\-×÷]+/, '');

            if (!cleanExpression || cleanExpression === '0') {
                return 0;
            }

            const tokens = cleanExpression.match(/(\d+|[+\-×÷])/g);
            if (!tokens || !tokens.length) {
                return 0;
            }

            let result = parseInt(tokens[0], 10);
            if (Number.isNaN(result)) {
                return 0;
            }

            for (let index = 1; index < tokens.length; index += 2) {
                const operator = tokens[index];
                const nextValue = parseInt(tokens[index + 1], 10);

                if (Number.isNaN(nextValue)) {
                    continue;
                }

                switch (operator) {
                    case '+':
                        result += nextValue;
                        break;
                    case '-':
                        result -= nextValue;
                        break;
                    case '×':
                        result *= nextValue;
                        break;
                    case '÷':
                        result = nextValue !== 0 ? Math.floor(result / nextValue) : 0;
                        break;
                    default:
                        break;
                }
            }

            return Math.max(0, result);
        } catch (error) {
            return 0;
        }
    };

    const handleConfirm = () => {
        onConfirm(evaluateExpression(expression));
        onClose();
    };

    const handleCharacterSelect = (index) => {
        setIsDisplayFocused(true);
        setSelectionRange({ start: index, end: index + 1 });
    };

    const handleDisplayClick = () => {
        const cursor = expression.length;
        setIsDisplayFocused(true);
        setSelectionRange({ start: cursor, end: cursor });
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.container} onClick={(event) => event.stopPropagation()}>
                <div style={styles.handleBar}></div>

                <div style={styles.displaySection}>
                    <span style={styles.label}>수정할 금액</span>
                    <div style={styles.displayRow}>
                        <div
                            ref={displayRef}
                            style={styles.displayValueEditor}
                            role="textbox"
                            aria-label="수정할 금액"
                            onClick={handleDisplayClick}
                        >
                            {expression.split('').map((character, index) => {
                                return (
                                    <span
                                        key={`${character}-${index}`}
                                        ref={(node) => {
                                            charRefs.current[index] = node;
                                        }}
                                        style={styles.displayChar}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleCharacterSelect(index);
                                        }}
                                    >
                                        {character}
                                    </span>
                                );
                            })}

                            {caretMetrics ? (
                                <span
                                    style={{
                                        ...styles.caretOverlay,
                                        left: `${caretMetrics.left}px`,
                                        top: `${caretMetrics.top}px`,
                                        height: `${caretMetrics.height}px`,
                                    }}
                                    aria-hidden="true"
                                />
                            ) : null}
                        </div>

                        <button type="button" style={styles.clearBtn} onClick={handleClear}>
                            <X size={18} color="#64748b" />
                        </button>
                        <span style={styles.unit}>원</span>
                    </div>
                    <div style={styles.underline}></div>
                </div>

                <div style={styles.keypad}>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('1')}>1</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('2')}>2</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('3')}>3</button>
                    <button type="button" style={styles.opBtn} onClick={() => handleOperation('-')}>−</button>

                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('4')}>4</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('5')}>5</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('6')}>6</button>
                    <button type="button" style={styles.opBtn} onClick={() => handleOperation('÷')}>÷</button>

                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('7')}>7</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('8')}>8</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('9')}>9</button>
                    <button type="button" style={styles.opBtn} onClick={() => handleOperation('×')}>×</button>

                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('00')}>00</button>
                    <button type="button" style={styles.numBtn} onClick={() => handleNumberClick('0')}>0</button>
                    <button type="button" style={styles.numBtn} onClick={handleBackspace}>←</button>
                    <button type="button" style={styles.opBtn} onClick={() => handleOperation('+')}>+</button>
                </div>

                <div style={styles.actionRow}>
                    <button type="button" style={styles.cancelBtn} onClick={onClose}>닫기</button>
                    <button type="button" style={styles.confirmBtn} onClick={handleConfirm}>수정하기</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 2000,
    },
    container: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '12px 20px 24px 20px',
        width: '100%',
        maxWidth: '430px',
        animation: 'slideUp 0.3s ease-out',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    },
    handleBar: {
        width: '40px',
        height: '4px',
        backgroundColor: '#d1d5db',
        borderRadius: '2px',
        margin: '0 auto 16px auto',
    },
    displaySection: {
        marginBottom: '20px',
    },
    label: {
        color: '#14b8a6',
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'block',
        marginBottom: '8px',
    },
    displayRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    displayValueEditor: {
        color: '#0f172a',
        fontSize: '2rem',
        fontWeight: '600',
        fontVariantNumeric: 'tabular-nums',
        flex: 1,
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '2px',
        cursor: 'text',
        userSelect: 'none',
        wordBreak: 'break-all',
        position: 'relative',
    },
    displayChar: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: '0.62em',
        borderRadius: '8px',
        padding: 0,
        transition: 'background-color 0.15s ease',
    },
    caretOverlay: {
        position: 'absolute',
        left: '-1px',
        top: '50%',
        width: '2px',
        backgroundColor: '#14b8a6',
        borderRadius: '1px',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        willChange: 'transform',
    },
    clearBtn: {
        background: 'transparent',
        border: 'none',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unit: {
        color: '#0f172a',
        fontSize: '1.25rem',
        fontWeight: '500',
    },
    underline: {
        height: '2px',
        background: 'linear-gradient(90deg, #14b8a6, #5eead4)',
        marginTop: '8px',
    },
    keypad: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '20px',
    },
    numBtn: {
        backgroundColor: '#f1f5f9',
        color: '#0f172a',
        border: 'none',
        borderRadius: '12px',
        padding: '18px',
        fontSize: '1.5rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.1s',
    },
    opBtn: {
        backgroundColor: '#e0f2f1',
        color: '#0d9488',
        border: 'none',
        borderRadius: '12px',
        padding: '18px',
        fontSize: '1.5rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.1s',
    },
    actionRow: {
        display: 'flex',
        gap: '12px',
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    confirmBtn: {
        flex: 1.5,
        backgroundColor: '#14b8a6',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
};
