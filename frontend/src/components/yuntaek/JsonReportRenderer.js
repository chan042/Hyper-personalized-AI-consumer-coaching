"use client";

export default function JsonReportRenderer({ content }) {
    if (!content || typeof content !== 'object') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <p>리포트 데이터를 불러올 수 없습니다.</p>
            </div>
        );
    }

    const { summary, weakness_analysis, yuntaek_analysis, next_month_strategy, expert_summary } = content;

    return (
        <div style={styles.container}>
            {/* 요약 섹션 */}
            {summary && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>📊 {summary.period} 소비 요약</h2>
                    <p style={styles.overview}>{summary.overview}</p>

                    {summary.budget_status && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>예산 현황</h3>
                            <div style={styles.budgetGrid}>
                                <div style={styles.budgetItem}>
                                    <span style={styles.budgetLabel}>예산</span>
                                    <span style={styles.budgetValue}>{summary.budget_status.budget?.toLocaleString()}원</span>
                                </div>
                                <div style={styles.budgetItem}>
                                    <span style={styles.budgetLabel}>지출</span>
                                    <span style={{ ...styles.budgetValue, color: '#ef4444' }}>{summary.budget_status.spent?.toLocaleString()}원</span>
                                </div>
                                <div style={styles.budgetItem}>
                                    <span style={styles.budgetLabel}>남은 예산</span>
                                    <span style={{ ...styles.budgetValue, color: '#10b981' }}>{summary.budget_status.remaining?.toLocaleString()}원</span>
                                </div>
                            </div>
                            <p style={styles.budgetMessage}>{summary.budget_status.message}</p>
                        </div>
                    )}

                    {summary.top_categories && summary.top_categories.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>주요 지출 카테고리</h3>
                            {summary.top_categories.map((cat, idx) => (
                                <div key={idx} style={styles.categoryItem}>
                                    <div style={styles.categoryHeader}>
                                        <span style={styles.categoryName}>{cat.category}</span>
                                        <span style={styles.categoryAmount}>{cat.amount?.toLocaleString()}원</span>
                                    </div>
                                    {cat.percentage && (
                                        <div style={styles.progressBar}>
                                            <div style={{ ...styles.progressFill, width: `${cat.percentage}%` }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* 윤택지수 분석 섹션 */}
            {yuntaek_analysis && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>🎯 윤택지수 분석</h2>
                    <div style={styles.card}>
                        <div style={styles.scoreHeader}>
                            <div>
                                <span style={styles.scoreLabel}>현재 점수</span>
                                <span style={styles.scoreValue}>{yuntaek_analysis.current_score}점</span>
                            </div>
                            {yuntaek_analysis.previous_score && (
                                <div>
                                    <span style={styles.scoreLabel}>전월 점수</span>
                                    <span style={styles.scoreValue}>{yuntaek_analysis.previous_score}점</span>
                                </div>
                            )}
                        </div>
                        <p style={styles.scoreMessage}>{yuntaek_analysis.score_message}</p>

                        {yuntaek_analysis.factors && yuntaek_analysis.factors.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={styles.subTitle}>세부 요소</h4>
                                {yuntaek_analysis.factors.map((factor, idx) => (
                                    <div key={idx} style={styles.factorItem}>
                                        <div style={styles.factorHeader}>
                                            <span style={styles.factorName}>{factor.name}</span>
                                            <span style={styles.factorScore}>{factor.current_score}/{factor.max_score}</span>
                                        </div>
                                        {factor.improvement_tip && (
                                            <p style={styles.tip}>💡 {factor.improvement_tip}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 취약점 분석 */}
            {weakness_analysis && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>⚠️ 개선 포인트</h2>

                    {weakness_analysis.impulse_spending && weakness_analysis.impulse_spending.items && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>충동 소비</h3>
                            <p style={styles.weaknessTotal}>
                                총 {weakness_analysis.impulse_spending.total_amount?.toLocaleString()}원
                                ({weakness_analysis.impulse_spending.percentage_of_total}%)
                            </p>
                            {weakness_analysis.impulse_spending.items.map((item, idx) => (
                                <div key={idx} style={styles.weaknessItem}>
                                    <p style={styles.weaknessDesc}>{item.description}</p>
                                    <p style={styles.weaknessReason}>{item.reason}</p>
                                    <span style={styles.weaknessAmount}>{item.amount?.toLocaleString()}원</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {weakness_analysis.leakage_areas && weakness_analysis.leakage_areas.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>누수 지출 패턴</h3>
                            {weakness_analysis.leakage_areas.map((area, idx) => (
                                <div key={idx} style={styles.leakageItem}>
                                    <h4 style={styles.leakagePattern}>{area.pattern}</h4>
                                    <p style={styles.leakageFreq}>빈도: {area.frequency}</p>
                                    <p style={styles.leakageAmount}>
                                        월 {area.monthly_total?.toLocaleString()}원
                                        (절약 가능: {area.potential_savings?.toLocaleString()}원)
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* 다음 달 전략 */}
            {next_month_strategy && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>📈 다음 달 전략</h2>

                    {next_month_strategy.priority_tasks && next_month_strategy.priority_tasks.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>우선순위 과제</h3>
                            {next_month_strategy.priority_tasks.map((task, idx) => (
                                <div key={idx} style={styles.taskItem}>
                                    <h4 style={styles.taskTitle}>#{task.rank} {task.title}</h4>
                                    <p style={styles.taskState}>현재: {task.current_state}</p>
                                    <p style={styles.taskTarget}>목표: {task.target_state}</p>
                                    {task.action_steps && task.action_steps.length > 0 && (
                                        <ul style={styles.actionList}>
                                            {task.action_steps.map((step, i) => (
                                                <li key={i} style={styles.actionItem}>{step}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {task.expected_savings && (
                                        <p style={styles.savings}>예상 절약: {task.expected_savings?.toLocaleString()}원</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* 전문가 요약 */}
            {expert_summary && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>👨‍💼 전문가 의견</h2>
                    <div style={styles.expertCard}>
                        <p style={styles.expertText}>{expert_summary.overall_assessment}</p>
                        {expert_summary.key_achievement && (
                            <div style={styles.expertHighlight}>
                                <strong>주요 성과:</strong> {expert_summary.key_achievement}
                            </div>
                        )}
                        {expert_summary.key_improvement_area && (
                            <div style={styles.expertHighlight}>
                                <strong>개선 영역:</strong> {expert_summary.key_improvement_area}
                            </div>
                        )}
                        {expert_summary.professional_advice && (
                            <p style={styles.expertAdvice}>{expert_summary.professional_advice}</p>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
    },
    section: {
        marginBottom: '1.5rem',
    },
    sectionTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '1rem',
    },
    overview: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#475569',
        marginBottom: '1.5rem',
    },
    card: {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1rem',
    },
    cardTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '1rem',
    },
    budgetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem',
    },
    budgetItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    budgetLabel: {
        fontSize: '0.85rem',
        color: '#64748b',
    },
    budgetValue: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1e293b',
    },
    budgetMessage: {
        fontSize: '0.95rem',
        color: '#475569',
        fontStyle: 'italic',
    },
    categoryItem: {
        marginBottom: '1rem',
    },
    categoryHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
    },
    categoryName: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#334155',
    },
    categoryAmount: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#3b82f6',
    },
    progressBar: {
        width: '100%',
        height: '8px',
        background: '#f1f5f9',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        borderRadius: '4px',
    },
    scoreHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '1rem',
    },
    scoreLabel: {
        display: 'block',
        fontSize: '0.85rem',
        color: '#64748b',
        marginBottom: '0.25rem',
    },
    scoreValue: {
        display: 'block',
        fontSize: '2rem',
        fontWeight: '800',
        color: '#10b981',
    },
    scoreMessage: {
        fontSize: '1rem',
        color: '#475569',
        marginBottom: '1rem',
    },
    subTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '0.75rem',
    },
    factorItem: {
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '12px',
        marginBottom: '0.75rem',
    },
    factorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
    },
    factorName: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#334155',
    },
    factorScore: {
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#3b82f6',
    },
    tip: {
        fontSize: '0.9rem',
        color: '#64748b',
        margin: 0,
    },
    weaknessTotal: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#ef4444',
        marginBottom: '1rem',
    },
    weaknessItem: {
        padding: '1rem',
        background: '#fef2f2',
        borderLeft: '4px solid #ef4444',
        borderRadius: '8px',
        marginBottom: '0.75rem',
    },
    weaknessDesc: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 0.5rem 0',
    },
    weaknessReason: {
        fontSize: '0.9rem',
        color: '#64748b',
        margin: '0 0 0.5rem 0',
    },
    weaknessAmount: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#ef4444',
    },
    leakageItem: {
        padding: '1rem',
        background: '#fff7ed',
        borderRadius: '12px',
        marginBottom: '0.75rem',
    },
    leakagePattern: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1e293b',
        margin: '0 0 0.5rem 0',
    },
    leakageFreq: {
        fontSize: '0.9rem',
        color: '#64748b',
        margin: '0 0 0.25rem 0',
    },
    leakageAmount: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#f59e0b',
        margin: 0,
    },
    taskItem: {
        padding: '1.5rem',
        background: '#f0f9ff',
        borderRadius: '12px',
        marginBottom: '1rem',
    },
    taskTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 0.75rem 0',
    },
    taskState: {
        fontSize: '0.95rem',
        color: '#64748b',
        margin: '0 0 0.25rem 0',
    },
    taskTarget: {
        fontSize: '0.95rem',
        color: '#10b981',
        fontWeight: '600',
        margin: '0 0 0.75rem 0',
    },
    actionList: {
        listStyle: 'decimal',
        paddingLeft: '1.5rem',
        margin: '0.75rem 0',
    },
    actionItem: {
        fontSize: '0.9rem',
        color: '#475569',
        marginBottom: '0.5rem',
    },
    savings: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#10b981',
        margin: '0.75rem 0 0 0',
    },
    expertCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        borderRadius: '16px',
        padding: '2rem',
    },
    expertText: {
        fontSize: '1.05rem',
        lineHeight: '1.8',
        marginBottom: '1.5rem',
    },
    expertHighlight: {
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '1rem',
        borderRadius: '12px',
        marginBottom: '1rem',
        fontSize: '1rem',
    },
    expertAdvice: {
        fontSize: '1rem',
        fontStyle: 'italic',
        borderTop: '1px solid rgba(255, 255, 255, 0.3)',
        paddingTop: '1rem',
        marginTop: '1rem',
    },
};
