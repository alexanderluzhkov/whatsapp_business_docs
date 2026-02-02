/**
 * n8n Code Node: LLM Output Parser (Split Output Version)
 *
 * Эта версия возвращает отдельные items для каждого листа.
 * Удобно использовать с Switch node для маршрутизации на разные Google Sheets nodes.
 *
 * Выход: массив items с полями:
 * - sheetName: название листа
 * - rows: массив строк для записи
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

    for (const detail of excludedDetails) {
      excludedChanges.push({
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: detail
      });
    }

    if (excludedDetails.length === 0 && excludedCategories.length > 0) {
      excludedChanges.push({
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: `Excluded ${excluded.count || 0} changes`
      });
    }

    // ===== 4. Обработка Agent_Feedback =====
    const uncertainties = data.agent_uncertainties || [];
    for (const uncertainty of uncertainties) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Uncertainty',
        Description: uncertainty
      });
    }

    const suggestions = data.agent_suggestions || [];
    for (const suggestion of suggestions) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Suggestion',
        Description: suggestion
      });
    }

    const taxonomyFeedback = data.taxonomy_feedback || {};
    const classificationUncertain = taxonomyFeedback.classification_uncertain || [];
    for (const item of classificationUncertain) {
      agentFeedback.push({
        Company: company,
        Feedback_Type: 'Classification_Issue',
        Description: `${item.change_description || ''}: ${item.uncertainty || ''}`
      });
    }

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
    if (a.Company !== b.Company) return a.Company.localeCompare(b.Company);
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
const inputItems = $input.all();
const result = processLLMOutput(inputItems);

// Возвращаем отдельные items для каждого листа
// Используйте Switch node с условием: {{ $json.sheetName }}
const output = [];

// Changes_Review
if (result.Changes_Review.length > 0) {
  output.push({
    json: {
      sheetName: 'Changes_Review',
      rowCount: result.Changes_Review.length,
      rows: result.Changes_Review
    }
  });
}

// Data_Quality_Issues
if (result.Data_Quality_Issues.length > 0) {
  output.push({
    json: {
      sheetName: 'Data_Quality_Issues',
      rowCount: result.Data_Quality_Issues.length,
      rows: result.Data_Quality_Issues
    }
  });
}

// Excluded_Changes
if (result.Excluded_Changes.length > 0) {
  output.push({
    json: {
      sheetName: 'Excluded_Changes',
      rowCount: result.Excluded_Changes.length,
      rows: result.Excluded_Changes
    }
  });
}

// Agent_Feedback
if (result.Agent_Feedback.length > 0) {
  output.push({
    json: {
      sheetName: 'Agent_Feedback',
      rowCount: result.Agent_Feedback.length,
      rows: result.Agent_Feedback
    }
  });
}

// Summary
if (result.Summary.length > 0) {
  output.push({
    json: {
      sheetName: 'Summary',
      rowCount: result.Summary.length,
      rows: result.Summary
    }
  });
}

return output;
