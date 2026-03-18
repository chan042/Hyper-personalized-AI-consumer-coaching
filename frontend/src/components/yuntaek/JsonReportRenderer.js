"use client";

const FACTOR_CONFIG = {
    budget_achievement: { label: '예산 달성률', max: 35 },
    alternative_action: { label: '대안 행동 실현도', max: 20 },
    spending_consistency: { label: '소비 일관성', max: 7 },
    challenge_success: { label: '챌린지 성공', max: 3 },
    health_score: { label: '건강 점수', max: 15 },
    leakage_improvement: { label: '누수 지출', max: 10 },
    growth_consumption: { label: '성장 소비', max: 10 },
};

const LABEL_OVERRIDES = {
    budget: '예산',
    spent: '지출',
    spending: '지출',
    remaining: '남은 예산',
    total_amount: '총액',
    percentage_of_total: '총지출 비중',
    current_score: '현재 점수',
    previous_score: '전월 점수',
    score_level: '점수 레벨',
    score_message: '점수 메시지',
    expected_savings: '예상 절약',
    potential_savings: '절약 가능 금액',
    monthly_total: '월 합계',
    current_state: '현재 상태',
    target_state: '목표 상태',
    overall_assessment: '종합 평가',
    key_achievement: '주요 성과',
    key_improvement_area: '개선 영역',
    professional_advice: '전문가 조언',
};

export default function JsonReportRenderer({ content }) {
    const parsedContent = coerceJsonValue(content);

    if (!parsedContent || typeof parsedContent !== 'object' || Array.isArray(parsedContent)) {
        return (
            <div style={styles.emptyState}>
                <p>리포트 데이터를 불러올 수 없습니다.</p>
            </div>
        );
    }

    const report = buildReportViewModel(parsedContent);

    if (!report.hasAnyContent) {
        return (
            <div style={styles.emptyState}>
                <p>표시할 리포트 내용이 없습니다.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {report.summary.visible && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>📊 {report.summary.period} 소비 요약</h2>
                    {report.summary.overview && (
                        <p style={styles.overview}>{report.summary.overview}</p>
                    )}

                    {report.summary.budget.visible && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>예산 현황</h3>
                            <div style={styles.budgetGrid}>
                                <MetricTile label="예산" value={formatCurrency(report.summary.budget.budget)} />
                                <MetricTile label="지출" value={formatCurrency(report.summary.budget.spent)} tone="danger" />
                                <MetricTile label="남은 예산" value={formatCurrency(report.summary.budget.remaining)} tone="success" />
                            </div>
                            {report.summary.budget.message && (
                                <p style={styles.budgetMessage}>{report.summary.budget.message}</p>
                            )}
                        </div>
                    )}

                    {report.summary.categories.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>주요 지출 카테고리</h3>
                            {report.summary.categories.map((category, index) => (
                                <div key={`${category.category}-${index}`} style={styles.categoryItem}>
                                    <div style={styles.categoryHeader}>
                                        <span style={styles.categoryName}>
                                            {category.category || `카테고리 ${index + 1}`}
                                        </span>
                                        <span style={styles.categoryAmount}>
                                            {formatCurrency(category.amount)}
                                        </span>
                                    </div>
                                    {category.percentage !== null && category.percentage > 0 && (
                                        <div style={styles.progressBar}>
                                            <div
                                                style={{
                                                    ...styles.progressFill,
                                                    width: `${Math.min(category.percentage, 100)}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {report.summary.details.length > 0 && (
                        <InfoGridCard title="추가 요약" entries={report.summary.details} />
                    )}
                </section>
            )}

            {report.score.visible && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>🎯 윤택지수 분석</h2>
                    <div style={styles.card}>
                        <div style={styles.scoreHeader}>
                            <div>
                                <span style={styles.scoreLabel}>현재 점수</span>
                                <span style={styles.scoreValue}>{formatScore(report.score.currentScore)}</span>
                            </div>
                            <div style={styles.scoreSide}>
                                {report.score.previousScore !== null && (
                                    <div style={styles.scoreMetaBlock}>
                                        <span style={styles.scoreLabel}>전월 점수</span>
                                        <span style={styles.prevScoreValue}>{formatScore(report.score.previousScore)}</span>
                                    </div>
                                )}
                                {report.score.level && (
                                    <span style={styles.scoreLevelBadge}>{report.score.level}</span>
                                )}
                            </div>
                        </div>

                        {report.score.message && (
                            <p style={styles.scoreMessage}>{report.score.message}</p>
                        )}

                        {report.score.factors.length > 0 && (
                            <div style={styles.factorSection}>
                                <h4 style={styles.subTitle}>세부 요소</h4>
                                <div style={styles.factorGrid}>
                                    {report.score.factors.map((factor, index) => (
                                        <div key={`${factor.name}-${index}`} style={styles.factorCard}>
                                            <div style={styles.factorHeader}>
                                                <span style={styles.factorName}>
                                                    {factor.name || `세부 요소 ${index + 1}`}
                                                </span>
                                                {factor.currentScore !== null && factor.maxScore !== null && (
                                                    <span style={styles.factorScore}>
                                                        {factor.currentScore}/{factor.maxScore}
                                                    </span>
                                                )}
                                            </div>
                                            {factor.description && (
                                                <p style={styles.factorDescription}>{factor.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {report.score.details.length > 0 && (
                        <InfoGridCard title="점수 추가 정보" entries={report.score.details} />
                    )}
                </section>
            )}

            {report.weakness.visible && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>⚠️ 개선 포인트</h2>

                    {report.weakness.impulse.visible && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>충동 소비</h3>
                            <p style={styles.weaknessTotal}>
                                총 {formatCurrency(report.weakness.impulse.totalAmount)}
                                {report.weakness.impulse.percentage !== null
                                    ? ` (${report.weakness.impulse.percentage}%)`
                                    : ''}
                            </p>
                            <div style={styles.stackList}>
                                {report.weakness.impulse.items.map((item, index) => (
                                    <div key={`${item.title}-${index}`} style={styles.weaknessItem}>
                                        <div style={styles.weaknessHeader}>
                                            <p style={styles.weaknessDesc}>
                                                {item.title || `항목 ${index + 1}`}
                                            </p>
                                            {item.amount !== null && (
                                                <span style={styles.weaknessAmount}>
                                                    {formatCurrency(item.amount)}
                                                </span>
                                            )}
                                        </div>
                                        {item.reason && (
                                            <p style={styles.weaknessReason}>{item.reason}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.weakness.leakageAreas.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>누수 지출 패턴</h3>
                            <div style={styles.stackList}>
                                {report.weakness.leakageAreas.map((area, index) => (
                                    <div key={`${area.title}-${index}`} style={styles.leakageItem}>
                                        <div style={styles.leakageHeader}>
                                            <h4 style={styles.leakagePattern}>
                                                {area.title || `패턴 ${index + 1}`}
                                            </h4>
                                            {area.frequency && (
                                                <span style={styles.leakageFrequencyPill}>
                                                    {area.frequency}
                                                </span>
                                            )}
                                        </div>
                                        {(area.monthlyTotal !== null || area.potentialSavings !== null) && (
                                            <p style={styles.leakageAmount}>
                                                월 {formatCurrency(area.monthlyTotal)}
                                                {area.potentialSavings !== null
                                                    ? ` · 절약 가능 ${formatCurrency(area.potentialSavings)}`
                                                    : ''}
                                            </p>
                                        )}
                                        {area.description && (
                                            <p style={styles.weaknessReason}>{area.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.weakness.details.length > 0 && (
                        <InfoGridCard title="개선 메모" entries={report.weakness.details} />
                    )}
                </section>
            )}

            {report.strategy.visible && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>📈 다음 달 전략</h2>

                    {report.strategy.tasks.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>우선순위 과제</h3>
                            <div style={styles.stackList}>
                                {report.strategy.tasks.map((task, index) => (
                                    <div key={`${task.title}-${index}`} style={styles.taskItem}>
                                        <div style={styles.taskTopRow}>
                                            <h4 style={styles.taskTitle}>
                                                {task.rank !== null ? `#${task.rank} ` : ''}
                                                {task.title || `과제 ${index + 1}`}
                                            </h4>
                                            {task.expectedSavings !== null && (
                                                <span style={styles.taskSavingsPill}>
                                                    {formatCurrency(task.expectedSavings)}
                                                </span>
                                            )}
                                        </div>
                                        {task.currentState && (
                                            <p style={styles.taskState}>현재: {task.currentState}</p>
                                        )}
                                        {task.targetState && (
                                            <p style={styles.taskTarget}>목표: {task.targetState}</p>
                                        )}
                                        {task.description && (
                                            <p style={styles.taskDescription}>{task.description}</p>
                                        )}
                                        {task.actionSteps.length > 0 && (
                                            <ul style={styles.actionList}>
                                                {task.actionSteps.map((step, stepIndex) => (
                                                    <li key={`${task.title}-${stepIndex}`} style={styles.actionItem}>
                                                        <span style={styles.actionBullet}>•</span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.strategy.details.length > 0 && (
                        <InfoGridCard title="전략 메모" entries={report.strategy.details} />
                    )}
                </section>
            )}

            {report.expert.visible && (
                <section style={styles.section}>
                    <h2 style={styles.sectionTitle}>👨‍💼 전문가 의견</h2>
                    <div style={styles.expertCard}>
                        {report.expert.assessment && (
                            <p style={styles.expertText}>{report.expert.assessment}</p>
                        )}
                        {report.expert.achievement && (
                            <div style={styles.expertHighlight}>
                                <strong>주요 성과:</strong> {report.expert.achievement}
                            </div>
                        )}
                        {report.expert.improvementArea && (
                            <div style={styles.expertHighlight}>
                                <strong>개선 영역:</strong> {report.expert.improvementArea}
                            </div>
                        )}
                        {report.expert.advice && (
                            <p style={styles.expertAdvice}>{report.expert.advice}</p>
                        )}
                    </div>

                    {report.expert.details.length > 0 && (
                        <InfoGridCard title="추가 의견" entries={report.expert.details} />
                    )}
                </section>
            )}
        </div>
    );
}

function MetricTile({ label, value, tone = 'default' }) {
    const valueStyle =
        tone === 'danger'
            ? styles.metricValueDanger
            : tone === 'success'
                ? styles.metricValueSuccess
                : styles.metricValue;

    return (
        <div style={styles.budgetItem}>
            <span style={styles.budgetLabel}>{label}</span>
            <span style={valueStyle}>{value}</span>
        </div>
    );
}

function InfoGridCard({ title, entries }) {
    if (!entries.length) {
        return null;
    }

    return (
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>{title}</h3>
            <div style={styles.infoGrid}>
                {entries.map((entry) => (
                    <div key={`${entry.label}-${entry.value}`} style={styles.infoItem}>
                        <span style={styles.infoLabel}>{entry.label}</span>
                        <span style={styles.infoValue}>{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function buildReportViewModel(content) {
    const rawSummary = content.summary;
    const rawScore = content.yuntaek_analysis;
    const rawWeakness = content.weakness_analysis;
    const rawStrategy = content.next_month_strategy;
    const rawExpert = content.expert_summary;

    const summarySource = ensureObject(rawSummary);
    const scoreSource = ensureObject(rawScore);
    const weaknessSource = ensureObject(rawWeakness);
    const strategySource = ensureObject(rawStrategy);
    const expertSource = ensureObject(rawExpert);

    const summary = {
        period: firstText(summarySource.period, typeof rawSummary === 'string' ? rawSummary : '', '월간'),
        overview: firstText(
            summarySource.overview,
            summarySource.summary,
            summarySource.description,
            summarySource.message,
        ),
        budget: normalizeBudgetStatus(
            summarySource.budget_status
            || summarySource.budgetStatus
            || (hasBudgetFields(summarySource) ? summarySource : null)
        ),
        categories: normalizeTopCategories(
            summarySource.top_categories
            || summarySource.topCategories
            || summarySource.categories
            || summarySource.category_spending
            || summarySource.category_breakdown
        ),
        details: extractEntries(summarySource, [
            'period',
            'overview',
            'summary',
            'description',
            'message',
            'budget_status',
            'budgetStatus',
            'top_categories',
            'topCategories',
            'categories',
            'category_spending',
            'category_breakdown',
            'budget',
            'spent',
            'remaining',
        ]),
    };
    summary.visible = Boolean(
        summary.overview
        || summary.budget.visible
        || summary.categories.length > 0
        || summary.details.length > 0
    );

    const score = {
        currentScore: firstNumber(scoreSource.current_score, scoreSource.score, scoreSource.currentScore),
        previousScore: firstNumber(scoreSource.previous_score, scoreSource.prev_score, scoreSource.previousScore),
        level: firstText(scoreSource.score_level, scoreSource.level),
        message: firstText(
            scoreSource.score_message,
            scoreSource.message,
            scoreSource.summary,
            scoreSource.overview,
            scoreSource.description,
            typeof rawScore === 'string' ? rawScore : '',
        ),
        factors: normalizeFactors(
            scoreSource.factors
            || scoreSource.factor_scores
            || scoreSource.factorScores
            || scoreSource.breakdown
            || scoreSource.details
        ),
        details: extractEntries(scoreSource, [
            'current_score',
            'score',
            'currentScore',
            'previous_score',
            'prev_score',
            'previousScore',
            'score_level',
            'level',
            'score_message',
            'message',
            'summary',
            'overview',
            'description',
            'factors',
            'factor_scores',
            'factorScores',
            'breakdown',
            'details',
        ]),
    };
    score.visible = Boolean(
        score.currentScore !== null
        || score.previousScore !== null
        || score.level
        || score.message
        || score.factors.length > 0
        || score.details.length > 0
    );

    const weakness = {
        impulse: normalizeImpulseSpending(
            weaknessSource.impulse_spending
            || weaknessSource.impulseSpending
            || weaknessSource.impulse
        ),
        leakageAreas: normalizeLeakageAreas(
            weaknessSource.leakage_areas
            || weaknessSource.leakageAreas
            || weaknessSource.leakage_patterns
            || weaknessSource.leakages
        ),
        details: extractEntries(weaknessSource, [
            'impulse_spending',
            'impulseSpending',
            'impulse',
            'leakage_areas',
            'leakageAreas',
            'leakage_patterns',
            'leakages',
        ]),
    };
    weakness.visible = Boolean(
        weakness.impulse.visible
        || weakness.leakageAreas.length > 0
        || weakness.details.length > 0
    );

    const strategy = {
        tasks: normalizePriorityTasks(
            strategySource.priority_tasks
            || strategySource.priorityTasks
            || strategySource.tasks
            || strategySource.action_plan
            || strategySource.actionPlan
        ),
        details: extractEntries(strategySource, [
            'priority_tasks',
            'priorityTasks',
            'tasks',
            'action_plan',
            'actionPlan',
        ]),
    };
    strategy.visible = Boolean(
        strategy.tasks.length > 0
        || strategy.details.length > 0
    );

    const expert = {
        assessment: firstText(
            expertSource.overall_assessment,
            expertSource.overallAssessment,
            expertSource.summary,
            expertSource.overview,
            typeof rawExpert === 'string' ? rawExpert : '',
        ),
        achievement: firstText(expertSource.key_achievement, expertSource.keyAchievement, expertSource.achievement),
        improvementArea: firstText(expertSource.key_improvement_area, expertSource.keyImprovementArea, expertSource.improvement_area),
        advice: firstText(expertSource.professional_advice, expertSource.professionalAdvice, expertSource.advice),
        details: extractEntries(expertSource, [
            'overall_assessment',
            'overallAssessment',
            'summary',
            'overview',
            'key_achievement',
            'keyAchievement',
            'achievement',
            'key_improvement_area',
            'keyImprovementArea',
            'improvement_area',
            'professional_advice',
            'professionalAdvice',
            'advice',
        ]),
    };
    expert.visible = Boolean(
        expert.assessment
        || expert.achievement
        || expert.improvementArea
        || expert.advice
        || expert.details.length > 0
    );

    return {
        summary,
        score,
        weakness,
        strategy,
        expert,
        hasAnyContent:
            summary.visible
            || score.visible
            || weakness.visible
            || strategy.visible
            || expert.visible,
    };
}

function ensureObject(value) {
    const parsed = coerceJsonValue(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function firstText(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

function parseNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.replace(/[^0-9.-]/g, '');
        if (!normalized) {
            return null;
        }
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function firstNumber(...values) {
    for (const value of values) {
        const parsed = parseNumber(value);
        if (parsed !== null) {
            return parsed;
        }
    }
    return null;
}

function formatCurrency(value) {
    const parsed = parseNumber(value);
    return parsed === null ? '-' : `${parsed.toLocaleString()}원`;
}

function formatScore(value) {
    const parsed = parseNumber(value);
    return parsed === null ? '-' : `${parsed}점`;
}

function hasBudgetFields(source) {
    return Boolean(
        source
        && typeof source === 'object'
        && (
            'budget' in source
            || 'spent' in source
            || 'remaining' in source
            || 'monthly_budget' in source
            || 'total_spending' in source
        )
    );
}

function normalizeBudgetStatus(value) {
    const source = ensureObject(value);
    const message =
        firstText(
            source.message,
            source.summary,
            source.description,
            source.analysis,
            typeof value === 'string' ? value : '',
        );

    const budget = firstNumber(source.budget, source.monthly_budget, source.total_budget);
    const spent = firstNumber(source.spent, source.total_spending, source.spending, source.used);
    const remaining = firstNumber(source.remaining, source.remaining_budget, source.balance);

    return {
        budget,
        spent,
        remaining,
        message,
        visible: Boolean(message || budget !== null || spent !== null || remaining !== null),
    };
}

function normalizeTopCategories(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item, index) => normalizeCategory(item, `카테고리 ${index + 1}`)).filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
            .map(([key, item], index) => normalizeCategory(item, key || `카테고리 ${index + 1}`))
            .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return parsed
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => normalizeCategory(line, `카테고리 ${index + 1}`))
            .filter(Boolean);
    }

    return [];
}

function normalizeCategory(item, fallbackName) {
    if (typeof item === 'string') {
        return {
            category: fallbackName,
            amount: parseNumber(item),
            percentage: null,
        };
    }

    if (typeof item === 'number') {
        return {
            category: fallbackName,
            amount: item,
            percentage: null,
        };
    }

    if (item && typeof item === 'object') {
        return {
            category: firstText(item.category, item.name, item.title, fallbackName),
            amount: firstNumber(item.amount, item.total, item.spent, item.value),
            percentage: firstNumber(item.percentage, item.percent, item.ratio, item.share),
        };
    }

    return null;
}

function normalizeFactors(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item, index) => normalizeFactor(item, `factor_${index}`)).filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
            .map(([key, item]) => normalizeFactor(item, key))
            .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return splitTextList(parsed).map((line, index) => ({
            name: `세부 요소 ${index + 1}`,
            currentScore: null,
            maxScore: null,
            description: line,
        }));
    }

    return [];
}

function normalizeFactor(item, key) {
    const config = getFactorConfig(key);
    const fallbackName = config?.label || humanizeKey(key);

    if (typeof item === 'number') {
        return {
            name: fallbackName,
            currentScore: item,
            maxScore: config?.max ?? null,
            description: '',
        };
    }

    if (typeof item === 'string') {
        return {
            name: fallbackName,
            currentScore: null,
            maxScore: config?.max ?? null,
            description: item,
        };
    }

    if (item && typeof item === 'object') {
        const name = firstText(item.name, item.title, fallbackName);
        const nestedConfig = getFactorConfig(name) || config;
        return {
            name,
            currentScore: firstNumber(item.current_score, item.currentScore, item.score, item.current, item.value),
            maxScore: firstNumber(item.max_score, item.maxScore, item.max, item.total, nestedConfig?.max),
            description: firstText(item.improvement_tip, item.tip, item.description, item.reason, item.analysis),
        };
    }

    return null;
}

function normalizeImpulseSpending(value) {
    const source = ensureObject(value);
    const items = normalizeImpulseItems(source.items || source.details || source.entries || value);
    const totalAmount = firstNumber(source.total_amount, source.totalAmount, source.total, source.amount);
    const percentage = firstNumber(source.percentage_of_total, source.percentage, source.percent, source.ratio);

    return {
        totalAmount,
        percentage,
        items,
        visible: Boolean(totalAmount !== null || percentage !== null || items.length > 0),
    };
}

function normalizeImpulseItems(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item, index) => normalizeImpulseItem(item, `항목 ${index + 1}`)).filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
            .map(([key, item]) => normalizeImpulseItem(item, key))
            .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return splitTextList(parsed).map((line, index) => ({
            title: `항목 ${index + 1}`,
            reason: line,
            amount: null,
        }));
    }

    return [];
}

function normalizeImpulseItem(item, fallbackTitle) {
    if (typeof item === 'string') {
        return {
            title: fallbackTitle,
            reason: item,
            amount: null,
        };
    }

    if (typeof item === 'number') {
        return {
            title: fallbackTitle,
            reason: '',
            amount: item,
        };
    }

    if (item && typeof item === 'object') {
        return {
            title: firstText(item.description, item.title, item.name, fallbackTitle),
            reason: firstText(item.reason, item.analysis, item.comment, item.note),
            amount: firstNumber(item.amount, item.total, item.value),
        };
    }

    return null;
}

function normalizeLeakageAreas(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item, index) => normalizeLeakageArea(item, `패턴 ${index + 1}`)).filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
            .map(([key, item]) => normalizeLeakageArea(item, key))
            .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return splitTextList(parsed).map((line, index) => ({
            title: `패턴 ${index + 1}`,
            frequency: '',
            monthlyTotal: null,
            potentialSavings: null,
            description: line,
        }));
    }

    return [];
}

function normalizeLeakageArea(item, fallbackTitle) {
    if (typeof item === 'string') {
        return {
            title: fallbackTitle,
            frequency: '',
            monthlyTotal: null,
            potentialSavings: null,
            description: item,
        };
    }

    if (typeof item === 'number') {
        return {
            title: fallbackTitle,
            frequency: '',
            monthlyTotal: item,
            potentialSavings: null,
            description: '',
        };
    }

    if (item && typeof item === 'object') {
        return {
            title: firstText(item.pattern, item.title, item.name, fallbackTitle),
            frequency: firstText(item.frequency, item.cycle, item.interval),
            monthlyTotal: firstNumber(item.monthly_total, item.monthlyTotal, item.total_amount, item.amount, item.total),
            potentialSavings: firstNumber(item.potential_savings, item.potentialSavings, item.expected_savings, item.savings),
            description: firstText(item.description, item.reason, item.analysis, item.comment),
        };
    }

    return null;
}

function normalizePriorityTasks(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed.map((item, index) => normalizePriorityTask(item, index + 1)).filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed)
            .map(([key, item], index) => normalizePriorityTask(item, parseNumber(key) ?? index + 1))
            .filter(Boolean)
            .sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999));
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return splitTextList(parsed).map((line, index) => ({
            rank: index + 1,
            title: line,
            currentState: '',
            targetState: '',
            description: '',
            actionSteps: [],
            expectedSavings: null,
        }));
    }

    return [];
}

function normalizePriorityTask(item, fallbackRank) {
    if (typeof item === 'string') {
        return {
            rank: fallbackRank,
            title: item,
            currentState: '',
            targetState: '',
            description: '',
            actionSteps: [],
            expectedSavings: null,
        };
    }

    if (item && typeof item === 'object') {
        return {
            rank: firstNumber(item.rank, fallbackRank),
            title: firstText(item.title, item.name, item.task, item.goal, item.subject),
            currentState: firstText(item.current_state, item.currentState, item.current, item.current_status),
            targetState: firstText(item.target_state, item.targetState, item.target, item.goal_state),
            description: firstText(item.description, item.reason, item.summary),
            actionSteps: normalizeActionSteps(
                item.action_steps
                || item.actionSteps
                || item.actions
                || item.steps
            ),
            expectedSavings: firstNumber(item.expected_savings, item.expectedSavings, item.savings, item.potential_savings),
        };
    }

    return null;
}

function normalizeActionSteps(value) {
    const parsed = coerceJsonValue(value);

    if (Array.isArray(parsed)) {
        return parsed
            .map((step) => (typeof step === 'string' ? step.trim() : firstText(step?.description, step?.title, step?.name)))
            .filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
        return Object.values(parsed)
            .map((step) => (typeof step === 'string' ? step.trim() : firstText(step?.description, step?.title, step?.name)))
            .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
        return splitTextList(parsed);
    }

    return [];
}

function splitTextList(value) {
    return value
        .split(/\n|•|·|(?<=\d)\.\s+/)
        .map((item) => item.trim().replace(/^-+\s*/, ''))
        .filter(Boolean);
}

function extractEntries(source, hiddenKeys = []) {
    const parsed = ensureObject(source);

    if (!parsed || typeof parsed !== 'object') {
        return [];
    }

    const hidden = new Set(hiddenKeys);

    return Object.entries(parsed)
        .flatMap(([key, value]) => {
            if (hidden.has(key)) {
                return [];
            }

            return flattenEntryValue(humanizeKey(key), value);
        })
        .filter((entry) => entry.value);
}

function flattenEntryValue(label, value) {
    const parsed = coerceJsonValue(value);

    if (typeof parsed === 'string' && parsed.trim()) {
        return [{ label, value: parsed.trim() }];
    }

    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
        return [{ label, value: parsed.toLocaleString() }];
    }

    if (typeof parsed === 'boolean') {
        return [{ label, value: parsed ? '예' : '아니오' }];
    }

    if (Array.isArray(parsed)) {
        const primitiveValues = parsed
            .map((item) => summarizeValue(item))
            .filter(Boolean);

        if (primitiveValues.length > 0) {
            return [{ label, value: primitiveValues.join('\n') }];
        }

        return [];
    }

    if (parsed && typeof parsed === 'object') {
        const nestedEntries = Object.entries(parsed)
            .flatMap(([key, nestedValue]) => flattenEntryValue(`${label} · ${humanizeKey(key)}`, nestedValue))
            .filter(Boolean);

        if (nestedEntries.length > 0) {
            return nestedEntries;
        }
    }

    return [];
}

function summarizeValue(value) {
    const parsed = coerceJsonValue(value);

    if (typeof parsed === 'string' && parsed.trim()) {
        return parsed.trim();
    }

    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
        return parsed.toLocaleString();
    }

    if (typeof parsed === 'boolean') {
        return parsed ? '예' : '아니오';
    }

    if (parsed && typeof parsed === 'object') {
        const summary = Object.entries(parsed)
            .map(([key, nestedValue]) => {
                const nestedSummary = summarizeValue(nestedValue);
                return nestedSummary ? `${humanizeKey(key)}: ${nestedSummary}` : '';
            })
            .filter(Boolean)
            .join(' / ');

        return summary;
    }

    return '';
}

function coerceJsonValue(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    const looksLikeJson =
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
        || (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (!looksLikeJson) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function getFactorConfig(key) {
    if (!key) {
        return null;
    }

    if (FACTOR_CONFIG[key]) {
        return FACTOR_CONFIG[key];
    }

    const normalizedKey = Object.keys(FACTOR_CONFIG).find(
        (configKey) => FACTOR_CONFIG[configKey].label === key
    );

    return normalizedKey ? FACTOR_CONFIG[normalizedKey] : null;
}

function humanizeKey(key) {
    if (!key) {
        return '';
    }

    if (LABEL_OVERRIDES[key]) {
        return LABEL_OVERRIDES[key];
    }

    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .trim()
        .replace(/^\w/, (char) => char.toUpperCase());
}

const styles = {
    emptyState: {
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#191F28',
        margin: 0,
        paddingLeft: '4px',
    },
    overview: {
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#4E5968',
        margin: 0,
        paddingLeft: '4px',
    },
    card: {
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        border: '1px solid rgba(229, 233, 238, 0.8)',
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#333D4B',
        margin: 0,
        marginBottom: '20px',
    },
    budgetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
        marginBottom: '16px',
    },
    budgetItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: '#F8FAFC',
        padding: '14px 10px',
        borderRadius: '16px',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '88px',
    },
    budgetLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#8B95A1',
        whiteSpace: 'nowrap',
    },
    metricValue: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#191F28',
        letterSpacing: '-0.3px',
        textAlign: 'center',
    },
    metricValueDanger: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#F04452',
        letterSpacing: '-0.3px',
        textAlign: 'center',
    },
    metricValueSuccess: {
        fontSize: '15px',
        fontWeight: '700',
        color: 'var(--primary, #14b8a6)',
        letterSpacing: '-0.3px',
        textAlign: 'center',
    },
    budgetMessage: {
        fontSize: '14px',
        color: '#4E5968',
        margin: 0,
        padding: '12px',
        background: '#F2F4F6',
        borderRadius: '12px',
        textAlign: 'center',
        lineHeight: '1.6',
    },
    categoryItem: {
        marginBottom: '16px',
    },
    categoryHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '8px',
    },
    categoryName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333D4B',
    },
    categoryAmount: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#191F28',
        textAlign: 'right',
    },
    progressBar: {
        width: '100%',
        height: '10px',
        background: '#F2F4F6',
        borderRadius: '999px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)',
        borderRadius: '999px',
    },
    scoreHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '16px',
    },
    scoreSide: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
    },
    scoreMetaBlock: {
        textAlign: 'right',
    },
    scoreLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#8B95A1',
        marginBottom: '4px',
    },
    scoreValue: {
        display: 'block',
        fontSize: '42px',
        fontWeight: '800',
        color: '#191F28',
        lineHeight: 1,
        letterSpacing: '-1px',
    },
    prevScoreValue: {
        display: 'block',
        fontSize: '18px',
        fontWeight: '700',
        color: '#475569',
    },
    scoreLevelBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        background: '#ECFDF5',
        color: '#047857',
        fontSize: '12px',
        fontWeight: '700',
    },
    scoreMessage: {
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#4E5968',
        margin: 0,
    },
    factorSection: {
        marginTop: '24px',
    },
    subTitle: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#333D4B',
        margin: 0,
        marginBottom: '14px',
    },
    factorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
    },
    factorCard: {
        background: '#F8FAFC',
        borderRadius: '18px',
        padding: '16px',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    factorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '8px',
    },
    factorName: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#1E293B',
    },
    factorScore: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#14B8A6',
        whiteSpace: 'nowrap',
    },
    factorDescription: {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#475569',
        margin: 0,
    },
    weaknessTotal: {
        fontSize: '14px',
        color: '#667085',
        margin: 0,
        marginBottom: '14px',
    },
    stackList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    weaknessItem: {
        padding: '16px',
        borderRadius: '18px',
        background: '#FFF7ED',
        border: '1px solid rgba(253, 230, 138, 0.6)',
    },
    weaknessHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'flex-start',
    },
    weaknessDesc: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#9A3412',
        margin: 0,
    },
    weaknessAmount: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#EA580C',
        whiteSpace: 'nowrap',
    },
    weaknessReason: {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#7C2D12',
        margin: 0,
        marginTop: '8px',
    },
    leakageItem: {
        padding: '16px',
        borderRadius: '18px',
        background: '#F8FAFC',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    leakageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'center',
    },
    leakagePattern: {
        fontSize: '15px',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0,
    },
    leakageFrequencyPill: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        borderRadius: '999px',
        background: '#E0F2FE',
        color: '#0369A1',
        fontSize: '12px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
    },
    leakageAmount: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#0F766E',
        margin: '8px 0 0',
    },
    taskItem: {
        padding: '18px',
        borderRadius: '20px',
        background: '#F8FAFC',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    taskTopRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        alignItems: 'flex-start',
    },
    taskTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#191F28',
        margin: 0,
    },
    taskSavingsPill: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        borderRadius: '999px',
        background: '#ECFDF5',
        color: '#047857',
        fontSize: '12px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
    },
    taskState: {
        margin: '10px 0 0',
        fontSize: '14px',
        color: '#475569',
    },
    taskTarget: {
        margin: '6px 0 0',
        fontSize: '14px',
        color: '#0F766E',
        fontWeight: '600',
    },
    taskDescription: {
        margin: '8px 0 0',
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.6',
    },
    actionList: {
        listStyle: 'none',
        padding: 0,
        margin: '12px 0 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    actionItem: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        fontSize: '14px',
        color: '#334155',
        lineHeight: '1.6',
    },
    actionBullet: {
        color: '#14B8A6',
        fontWeight: '700',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: '#F8FAFC',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    infoLabel: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#94A3B8',
    },
    infoValue: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordBreak: 'keep-all',
    },
    expertCard: {
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    expertText: {
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#334155',
        margin: 0,
    },
    expertHighlight: {
        marginTop: '14px',
        padding: '14px 16px',
        background: '#FFFFFF',
        borderRadius: '16px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#475569',
        border: '1px solid rgba(226, 232, 240, 0.9)',
    },
    expertAdvice: {
        marginTop: '16px',
        fontSize: '14px',
        lineHeight: '1.7',
        color: '#0F766E',
        background: '#ECFDF5',
        padding: '14px 16px',
        borderRadius: '16px',
    },
};
