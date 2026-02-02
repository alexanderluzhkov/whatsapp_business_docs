/**
 * n8n Code Node: LLM Output Parser для заполнения Google Sheets
 *
 * Входные данные: массив объектов из Parse LLM Output
 * Выходные данные: объект с массивами для каждого листа таблицы
 *
 * Листы:
 * - Changes_Review: основные изменения для проверки
 * - Data_Quality_Issues: проблемы качества данных
 * - Excluded_Changes: исключённые изменения
 * - Agent_Feedback: обратная связь для улучшения LLM
 * - Summary: сводка по компании
 */

// Функция определения приоритета
function getPriority(verificationStatus) {
  switch (verificationStatus) {
    case 'contradicts_document':
      return 'HIGH';
    case 'not_found':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

// Основная функция обработки
function processLLMOutput(items) {
  const changesReview = [];
  const dataQualityIssues = [];
  const excludedChanges = [];
  const agentFeedback = [];
  const summary = [];

  for (const item of items) {
    const data = item.json || item;
    const company = data.company || '';
    const period = data.comparison_period || '';
    const processedAt = data.processedAt || new Date().toISOString();

    // Счётчики для Summary
    let totalChanges = 0;
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    // ===== 1. Обработка Changes_Review =====
    const semanticChanges = data.semantic_changes || {};

    // 1.1 Plans changes
    const plans = semanticChanges.plans || [];
    for (const plan of plans) {
      const planName = plan.plan_name || '';
      const changes = plan.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'Plans',
          Plan_Name: planName,
          Instrument_Name: '',
          KPI_Name: '',
          Tranche: '',
          Field: change.field || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // 1.2 KPI Applications changes
    const kpiApplications = semanticChanges.kpi_applications || [];
    for (const kpiApp of kpiApplications) {
      const planName = kpiApp.plan_name || '';
      const instrumentName = kpiApp.instrument_name || '';
      const changes = kpiApp.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'KPI_Applications',
          Plan_Name: planName,
          Instrument_Name: instrumentName,
          KPI_Name: change.kpi_name || '',
          Tranche: change.tranche || '',
          Field: change.field || change.application_comment || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // 1.3 Instruments changes
    const instruments = semanticChanges.instruments || [];
    for (const instrument of instruments) {
      const instrumentName = instrument.instrument_name || '';
      const changes = instrument.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'Instruments',
          Plan_Name: '',
          Instrument_Name: instrumentName,
          KPI_Name: '',
          Tranche: '',
          Field: change.field || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // 1.4 Eligibility changes
    const eligibility = semanticChanges.eligibility || [];
    for (const elig of eligibility) {
      const changes = elig.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'Eligibility',
          Plan_Name: elig.plan_name || '',
          Instrument_Name: '',
          KPI_Name: '',
          Tranche: '',
          Field: change.field || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // 1.5 Leaver Rules changes
    const leaverRules = semanticChanges.leaver_rules || [];
    for (const leaver of leaverRules) {
      const changes = leaver.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'Leaver_Rules',
          Plan_Name: leaver.plan_name || '',
          Instrument_Name: '',
          KPI_Name: '',
          Tranche: '',
          Field: change.field || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // 1.6 SB Adjustments changes
    const sbAdjustments = semanticChanges.sb_adjustments || [];
    for (const adj of sbAdjustments) {
      const changes = adj.changes || [];

      for (const change of changes) {
        const priority = getPriority(change.verification_status);
        totalChanges++;
        if (priority === 'HIGH') highPriority++;
        else if (priority === 'MEDIUM') mediumPriority++;
        else lowPriority++;

        changesReview.push({
          Company: company,
          Period: period,
          Priority: priority,
          Section: 'SB_Adjustments',
          Plan_Name: adj.plan_name || '',
          Instrument_Name: '',
          KPI_Name: '',
          Tranche: '',
          Field: change.field || '',
          Change_Type: change.change_type || '',
          Old_Value: change.old_value || '',
          New_Value: change.new_value || '',
          Verification_Status: change.verification_status || '',
          Citation: change.citation || '',
          Doc_Source: change.citation_source || '',
          Agent_Notes: change.notes || ''
        });
      }
    }

    // ===== 2. Обработка Data_Quality_Issues =====
    const dqIssues = data.data_quality_issues || [];
    for (const issue of dqIssues) {
      dataQualityIssues.push({
        Company: company,
        Section: issue.section || '',
        Record_ID: issue.record_identifier || '',
        Issue_Type: issue.issue_type || '',
        Description: issue.description || '',
        Citation: issue.citation || '',
        Doc_Source: issue.citation_source || ''
      });
    }

    // ===== 3. Обработка Excluded_Changes =====
    const excluded = data.excluded_changes_summary || {};
    const excludedDetails = excluded.details || [];
    const excludedCategories = excluded.categories || [];

    // Добавляем каждый detail как отдельную строку
    for (const detail of excludedDetails) {
      excludedChanges.push({
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: detail
      });
    }

    // Если нет details, но есть категории - добавляем сводную строку
    if (excludedDetails.length === 0 && excludedCategories.length > 0) {
      excludedChanges.push({
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: `Excluded ${excluded.count || 0} changes`
      });
    }

    // ===== 4. Обработка Agent_Feedback =====

    // 4.1 Agent Uncertainties
    const uncertainties = data.agent_uncertainties || [];
    for (const uncertainty of uncertainties) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Uncertainty',
        Description: uncertainty
      });
    }

    // 4.2 Agent Suggestions
    const suggestions = data.agent_suggestions || [];
    for (const suggestion of suggestions) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Suggestion',
        Description: suggestion
      });
    }

    // 4.3 Taxonomy Feedback - Classification Uncertain
    const taxonomyFeedback = data.taxonomy_feedback || {};
    const classificationUncertain = taxonomyFeedback.classification_uncertain || [];
    for (const item of classificationUncertain) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Classification_Issue',
        Description: `${item.change_description || ''}: ${item.uncertainty || ''}`
      });
    }

    // 4.4 Taxonomy Feedback - Missing Change Types
    const missingTypes = taxonomyFeedback.change_type_missing || [];
    for (const missing of missingTypes) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Missing_Change_Type',
        Description: typeof missing === 'string' ? missing : JSON.stringify(missing)
      });
    }

    // ===== 5. Обработка Summary =====
    summary.push({
      Company: company,
      Period: period,
      Processing_Date: processedAt.split('T')[0],
      Total_Changes: totalChanges,
      High_Priority: highPriority,
      Medium_Priority: mediumPriority,
      Low_Priority: lowPriority,
      Data_Quality_Issues: dqIssues.length,
      Uncertainties: uncertainties.length
    });
  }

  // Сортировка Changes_Review по приоритету
  const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
  changesReview.sort((a, b) => {
    // Сначала по компании
    if (a.Company !== b.Company) return a.Company.localeCompare(b.Company);
    // Затем по приоритету
    return priorityOrder[a.Priority] - priorityOrder[b.Priority];
  });

  return {
    Changes_Review: changesReview,
    Data_Quality_Issues: dataQualityIssues,
    Excluded_Changes: excludedChanges,
    Agent_Feedback: agentFeedback,
    Summary: summary
  };
}

// ===== ТОЧКА ВХОДА n8n =====
// Получаем входные данные
const inputItems = $input.all();

// Обрабатываем данные
const result = processLLMOutput(inputItems);

// Возвращаем результат в формате для дальнейшей обработки
// Вариант 1: Один объект со всеми листами (для использования с несколькими Google Sheets nodes)
return [{
  json: {
    ...result,
    // Метаданные
    _meta: {
      processedAt: new Date().toISOString(),
      inputItemsCount: inputItems.length,
      outputCounts: {
        Changes_Review: result.Changes_Review.length,
        Data_Quality_Issues: result.Data_Quality_Issues.length,
        Excluded_Changes: result.Excluded_Changes.length,
        Agent_Feedback: result.Agent_Feedback.length,
        Summary: result.Summary.length
      }
    }
  }
}];
