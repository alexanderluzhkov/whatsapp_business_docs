/**
 * n8n Code Node: LLM Output Parser (Individual Rows Version)
 *
 * Эта версия возвращает каждую строку как отдельный item.
 * Идеально для использования с Google Sheets node в режиме "Append".
 *
 * После этого Code node используйте Switch node для разделения по sheetName,
 * затем Google Sheets node для каждого листа.
 *
 * Switch node условия:
 * - Changes_Review: {{ $json.sheetName === 'Changes_Review' }}
 * - Data_Quality_Issues: {{ $json.sheetName === 'Data_Quality_Issues' }}
 * - и т.д.
 */

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

const inputItems = $input.all();
const output = [];

for (const item of inputItems) {
  const data = item.json || item;
  const company = data.company || '';
  const period = data.comparison_period || '';
  const processedAt = data.processedAt || new Date().toISOString();

  // Счётчики для Summary
  let totalChanges = 0;
  let highPriority = 0;
  let mediumPriority = 0;
  let lowPriority = 0;

  const semanticChanges = data.semantic_changes || {};

  // ===== Changes_Review =====

  // Plans
  const plans = semanticChanges.plans || [];
  for (const plan of plans) {
    const planName = plan.plan_name || '';
    for (const change of (plan.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // KPI Applications
  const kpiApplications = semanticChanges.kpi_applications || [];
  for (const kpiApp of kpiApplications) {
    const planName = kpiApp.plan_name || '';
    const instrumentName = kpiApp.instrument_name || '';
    for (const change of (kpiApp.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // Instruments
  const instruments = semanticChanges.instruments || [];
  for (const instrument of instruments) {
    const instrumentName = instrument.instrument_name || '';
    for (const change of (instrument.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // Eligibility
  const eligibility = semanticChanges.eligibility || [];
  for (const elig of eligibility) {
    for (const change of (elig.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // Leaver Rules
  const leaverRules = semanticChanges.leaver_rules || [];
  for (const leaver of leaverRules) {
    for (const change of (leaver.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // SB Adjustments
  const sbAdjustments = semanticChanges.sb_adjustments || [];
  for (const adj of sbAdjustments) {
    for (const change of (adj.changes || [])) {
      const priority = getPriority(change.verification_status);
      totalChanges++;
      if (priority === 'HIGH') highPriority++;
      else if (priority === 'MEDIUM') mediumPriority++;
      else lowPriority++;

      output.push({
        json: {
          sheetName: 'Changes_Review',
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
        }
      });
    }
  }

  // ===== Data_Quality_Issues =====
  const dqIssues = data.data_quality_issues || [];
  for (const issue of dqIssues) {
    output.push({
      json: {
        sheetName: 'Data_Quality_Issues',
        Company: company,
        Section: issue.section || '',
        Record_ID: issue.record_identifier || '',
        Issue_Type: issue.issue_type || '',
        Description: issue.description || '',
        Citation: issue.citation || '',
        Doc_Source: issue.citation_source || ''
      }
    });
  }

  // ===== Excluded_Changes =====
  const excluded = data.excluded_changes_summary || {};
  const excludedDetails = excluded.details || [];
  const excludedCategories = excluded.categories || [];

  for (const detail of excludedDetails) {
    output.push({
      json: {
        sheetName: 'Excluded_Changes',
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: detail
      }
    });
  }

  if (excludedDetails.length === 0 && excludedCategories.length > 0) {
    output.push({
      json: {
        sheetName: 'Excluded_Changes',
        Company: company,
        Category: excludedCategories.join(', '),
        Detail: `Excluded ${excluded.count || 0} changes`
      }
    });
  }

  // ===== Agent_Feedback =====
  const uncertainties = data.agent_uncertainties || [];
  for (const uncertainty of uncertainties) {
    output.push({
      json: {
        sheetName: 'Agent_Feedback',
        Company: company,
        Feedback_Type: 'Uncertainty',
        Description: uncertainty
      }
    });
  }

  const suggestions = data.agent_suggestions || [];
  for (const suggestion of suggestions) {
    output.push({
      json: {
        sheetName: 'Agent_Feedback',
        Company: company,
        Feedback_Type: 'Suggestion',
        Description: suggestion
      }
    });
  }

  const taxonomyFeedback = data.taxonomy_feedback || {};
  const classificationUncertain = taxonomyFeedback.classification_uncertain || [];
  for (const item of classificationUncertain) {
    output.push({
      json: {
        sheetName: 'Agent_Feedback',
        Company: company,
        Feedback_Type: 'Classification_Issue',
        Description: `${item.change_description || ''}: ${item.uncertainty || ''}`
      }
    });
  }

  const missingTypes = taxonomyFeedback.change_type_missing || [];
  for (const missing of missingTypes) {
    output.push({
      json: {
        sheetName: 'Agent_Feedback',
        Company: company,
        Feedback_Type: 'Missing_Change_Type',
        Description: typeof missing === 'string' ? missing : JSON.stringify(missing)
      }
    });
  }

  // ===== Summary =====
  output.push({
    json: {
      sheetName: 'Summary',
      Company: company,
      Period: period,
      Processing_Date: processedAt.split('T')[0],
      Total_Changes: totalChanges,
      High_Priority: highPriority,
      Medium_Priority: mediumPriority,
      Low_Priority: lowPriority,
      Data_Quality_Issues: dqIssues.length,
      Uncertainties: uncertainties.length
    }
  });
}

// Сортировка: сначала по sheetName, потом по Priority для Changes_Review
const sheetOrder = {
  'Summary': 0,
  'Changes_Review': 1,
  'Data_Quality_Issues': 2,
  'Excluded_Changes': 3,
  'Agent_Feedback': 4
};
const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };

output.sort((a, b) => {
  const sheetA = sheetOrder[a.json.sheetName] ?? 99;
  const sheetB = sheetOrder[b.json.sheetName] ?? 99;
  if (sheetA !== sheetB) return sheetA - sheetB;

  // Для Changes_Review сортируем по Priority
  if (a.json.sheetName === 'Changes_Review' && b.json.sheetName === 'Changes_Review') {
    const prioA = priorityOrder[a.json.Priority] ?? 99;
    const prioB = priorityOrder[b.json.Priority] ?? 99;
    return prioA - prioB;
  }

  return 0;
});

return output;
