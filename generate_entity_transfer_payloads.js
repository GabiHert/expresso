const fs = require("fs");
const path = require("path");

// ============================================
// CONFIGURATION - Edit these values as needed
// ============================================

const CONFIG = {
  organizationId: 180910,
  requesterProfilePublicId: "bdb4ee61-34e6-4afe-8952-3dc30da1edac",
  agreementId: "MOCK-AGREEMENT-ID", // Replace with actual agreement ID
  effectiveDate: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
};

const API_CONFIG = {
  url: "https://api-prod-admin.letsdeel.com/admin/peo/tech_ops/entity_transfer",
  token:
    "-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lc3RhbXAiOjE3Njc3OTI2OTcxMTgsImFkbWluIjp0cnVlLCJkZWVsIjoiZ2FicmllbC5oZXJ0ZXJAZGVlbC5jb20iLCJwcm9maWxlIjoxNjY3MjQ5LCJyZWFkT25seSI6ZmFsc2UsImlkIjoxNTk0ODU4LCJpYXQiOjE3Njc3OTI2OTcsImV4cCI6MTc3MDM4NDY5NywiYXVkIjoicHJvZCIsImlzcyI6ImFwaS1wcm9kLmxldHNkZWVsLmNvbSIsInN1YiI6ImFwaSJ9.hMcgBvnC8BIEWF7YTINWwjOY5aJtZ88vKlWSUkk8kDfDHudPLEWVnlOCGR68Sg23mR7Nf4dt_1ogePt-kQjQJksOtiO6SwO5sazukW94Fzc8Fx8ynwBfoeejgLuaIuayJGXkvUPyc2MN3SDJBkYu0wGMMKF3pTsFM1zh2HHb8IjoqkzJKO_LN_G9bTmmAp1J4HFxBB3nToZL5lWdGmZldRaJzmynLAs11l_8lduxc3WL7Cldoj7-gFFZ9QmgO0VP3ljuLh4PAYbfSKIKNt-76jhgYawc_5Tfsgg_WniBGhCYcFOy3lkXJnPvdjuK2gJoRQGGgVGzYcjMpmXox0pGlw", // Replace with actual token
};

// ============================================
// COMMAND LINE ARGUMENTS
// ============================================

const args = process.argv.slice(2);
const shouldExecuteRequests = args.includes("--request");

// ============================================
// INPUT DATA - Paste your spreadsheet data here as JSON array
// ============================================

const SPREADSHEET_DATA = [
  // {
  //   "employeeName": "Anthony Darden",
  //   "currentEntity": "Amae Health Services, LLC",
  //   "destinationEntity": "Amae Health, Inc.",
  //   "group": "NC-RDU-01-NorthHills",
  //   "payrollGroup": "BIMONTHLY",
  //   "benefitGroup": "All Employees",
  //   "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //   "workLocation": "Office - North Carolina",
  //   "jobTitle": "Peer Support Specialist"
  // },

  // {
  //   "employeeName": "Catherine Scott",
  //   "currentEntity": "Amae Health Services, LLC",
  //   "destinationEntity": "Amae Health, Inc.",
  //   "group": "NC-RDU-01-NorthHills",
  //   "payrollGroup": "BIMONTHLY",
  //   "benefitGroup": "All Employees",
  //   "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //   "workLocation": "Office - North Carolina",
  //   "jobTitle": "Certified Peer Support Specialist"
  // },

  // {
  //   employeeName: "Collin Wang",
  //   currentEntity: "Amae Health Services, LLC",
  //   destinationEntity: "Amae Health, Inc.",
  //   group: "CA-SFBay-01-Los Altos",
  //   payrollGroup: "BIMONTHLY",
  //   benefitGroup: "All Employees",
  //   timeOffPolicy:
  //     "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
  //   workLocation: "Office - 167 S. San Antonio Road, Suite 2",
  //   jobTitle: "Senior Clinical Care Coordinator",
  // },

  //   {
  //     "employeeName": "Courtney Palcic",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "CA-SFBay-01-Los Altos",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - 167 S. San Antonio Road, Suite 2",
  //     "jobTitle": "Transition Planner"
  //   },

  //   {
  //     "employeeName": "Deylanis Henderson",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "NC-RDU-01-NorthHills",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - North Carolina",
  //     "jobTitle": "CMA"
  //   },

  //   {
  //     "employeeName": "Jessica Seo",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "CA-SFBay-01-Los Altos",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - 167 S. San Antonio Road, Suite 2",
  //     "jobTitle": "Practice Operations Manager"
  //   },

  //   {
  //     "employeeName": "Jordan Jacobsen",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "NC-RDU-01-NorthHills",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - North Carolina",
  //     "jobTitle": "Practice Operations Manager"
  //   },

  //   {
  //     "employeeName": "Madison Federici",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "CA-LA-01-Westwood",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - California",
  //     "jobTitle": "Health Coach"

  //     /*
  //     {
  //     "success": false,
  //     "transferId": "test-transfer-123",
  //     "itemId": "test-item-1",
  //     "status": "FAILED",
  //     "completedSteps": [],
  //     "crossHireCompleted": false,
  //     "workLocationId": "0e03f1a0-5dc6-49af-8847-2ba1b1fb2107",
  //     "jobCode": "HC",
  //     "error": "Cross-hire sanity check failed with 1 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: medywep)",
  //     "errorDetails": {
  //         "message": "Cross-hire sanity check failed with 1 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: medywep)",
  //         "stack": "Error: Cross-hire sanity check failed with 1 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: medywep)\n    at CrossHireSanityCheckStep.execute (/usr/src/app/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.js:190:19)\n    at /usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:150:76\n    at overriddenCallback (/usr/src/app/utils/setup_db.js:63:59)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n    at async /usr/src/app/node_modules/.pnpm/sequelize@6.37.7_pg@8.16.0_snowflake-sdk@2.0.4_asn1.js@5.4.1_/node_modules/sequelize/lib/sequelize.js:507:18\n    at async TransferStepExecutor.executeInTransaction (/usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:140:16)\n    at async TransferStepExecutor.executeAll (/usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:51:38)\n    at async EntityTransferService.executeTransfer (/usr/src/app/services/peo/entity_transfer/entity_transfer_service.js:67:55)\n    at async TechOpsAdminController.executeEntityTransfer (/usr/src/app/controllers/admin/peo/tech_ops.js:178:28)\n    at async callMethod (/usr/src/app/modules/core/controllers/decorators/controller_decorator.js:56:25)",
  //         "name": "Error"
  //     }
  // }
  //     */
  //   },

  //   {
  //     "employeeName": "Makeda Ramnath",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "Amae",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Remote - Pennsylvania",
  //     "jobTitle": "Enrollment Specialist"
  //   },

  {
    employeeName: "Namrata Poola",
    currentEntity: "Amae Health Services, LLC",
    destinationEntity: "Amae Health, Inc.",
    group: "CA-LA-01-Westwood",
    payrollGroup: "BIMONTHLY",
    benefitGroup: "All Employees",
    timeOffPolicy:
      "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
    workLocation: "Office - California",
    jobTitle: "Clinic Care Coordinator",

    /*
      {
      "success": false,
      "transferId": "test-transfer-123",
      "itemId": "test-item-1",
      "status": "FAILED",
      "completedSteps": [],
      "crossHireCompleted": false,
      "workLocationId": "0e03f1a0-5dc6-49af-8847-2ba1b1fb2107",
      "jobCode": "CCC",
      "error": "Cross-hire sanity check failed with 4 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: 35xn2xj)\n
  2. I-94 Admission Number is required for Alien Authorized status (contract: 35xn2xj)\n
    3. I-9 Foreign Passport Number is required for Alien Authorized status (contract: 35xn2xj)\n  4. I-9 Passport Issuing Country is required for Alien Authorized status (contract: 35xn2xj)",
      "errorDetails": {
          "message": "Cross-hire sanity check failed with 4 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: 35xn2xj)\n  2. I-94 Admission Number is required for Alien Authorized status (contract: 35xn2xj)\n  3. I-9 Foreign Passport Number is required for Alien Authorized status (contract: 35xn2xj)\n  4. I-9 Passport Issuing Country is required for Alien Authorized status (contract: 35xn2xj)",
          "stack": "Error: Cross-hire sanity check failed with 4 error(s):\n  1. Zip Code must be exactly 5 characters, found 10 (contract: 35xn2xj)\n  2. I-94 Admission Number is required for Alien Authorized status (contract: 35xn2xj)\n  3. I-9 Foreign Passport Number is required for Alien Authorized status (contract: 35xn2xj)\n  4. I-9 Passport Issuing Country is required for Alien Authorized status (contract: 35xn2xj)\n    at CrossHireSanityCheckStep.execute (/usr/src/app/services/peo/entity_transfer/steps/cross_hire_sanity_check_step.js:190:19)\n    at /usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:150:76\n    at overriddenCallback (/usr/src/app/utils/setup_db.js:63:59)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n    at async /usr/src/app/node_modules/.pnpm/sequelize@6.37.7_pg@8.16.0_snowflake-sdk@2.0.4_asn1.js@5.4.1_/node_modules/sequelize/lib/sequelize.js:507:18\n    at async TransferStepExecutor.executeInTransaction (/usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:140:16)\n    at async TransferStepExecutor.executeAll (/usr/src/app/services/peo/entity_transfer/transfer_step_executor.js:51:38)\n    at async EntityTransferService.executeTransfer (/usr/src/app/services/peo/entity_transfer/entity_transfer_service.js:67:55)\n    at async TechOpsAdminController.executeEntityTransfer (/usr/src/app/controllers/admin/peo/tech_ops.js:178:28)\n    at async callMethod (/usr/src/app/modules/core/controllers/decorators/controller_decorator.js:56:25)",
          "name": "Error"
      }
  }
      */
  },

  //   {
  //     "employeeName": "Priscilla S Lugo",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "Amae",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "15 Days Combined Sick Leave and Vacation (with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Remote - New Hampshire",
  //     "jobTitle": "Patient Conversion Lead"
  //   },

  //   {
  //     "employeeName": "Shefali Gupta",
  //     "currentEntity": "Amae Health Services, LLC",
  //     "destinationEntity": "Amae Health, Inc.",
  //     "group": "CA-SFBay-01-Los Altos",
  //     "payrollGroup": "BIMONTHLY",
  //     "benefitGroup": "All Employees",
  //     "timeOffPolicy": "California and New York Vacation (10 Days Annually with 5 Additional Days at 1 Year Anniversary)",
  //     "workLocation": "Office - 167 S. San Antonio Road, Suite 2",
  //     "jobTitle": "Clinic Care Coordinator"
  //   },
];

// ============================================
// LOOKUP DATA - Loaded from entity_transfers_data.json
// ============================================

const lookupDataPath = path.join(__dirname, "entity_transfers_data.json");
const lookupData = JSON.parse(fs.readFileSync(lookupDataPath, "utf8"));

// ============================================
// LOOKUP FUNCTIONS (return { value, error })
// ============================================

function safeLookup(array, predicate, errorMessage) {
  const result = array.find(predicate);
  if (!result) {
    return { value: null, error: errorMessage };
  }
  return { value: result, error: null };
}

function lookupBasePeoContractOid(employeeName) {
  const result = safeLookup(
    lookupData.base_peo_contract_oids,
    (e) => e.employee_name.toLowerCase() === employeeName.toLowerCase(),
    `Employee not found: "${employeeName}"`
  );
  return { value: result.value?.base_peo_contract_oid, error: result.error };
}

function lookupLegalEntityPublicId(entityName, fieldName) {
  const result = safeLookup(
    lookupData.legal_entity_public_ids,
    (e) => e.name.toLowerCase() === entityName.toLowerCase(),
    `${fieldName} - Legal entity not found: "${entityName}"`
  );
  return { value: result.value?.legal_entity_public_id, error: result.error };
}

function lookupTeamId(teamName) {
  const result = safeLookup(
    lookupData.new_team_ids,
    (e) => e.team_name.toLowerCase() === teamName.toLowerCase(),
    `Team not found: "${teamName}"`
  );
  return { value: result.value?.new_team_id, error: result.error };
}

function lookupPayrollSettingsId(cycleType) {
  const result = safeLookup(
    lookupData.new_payroll_settings_ids,
    (e) => e.cycle_type.toLowerCase() === cycleType.toLowerCase(),
    `Payroll settings not found for cycle type: "${cycleType}"`
  );
  return { value: result.value?.new_payroll_settings_id, error: result.error };
}

function lookupBenefitGroupId(groupName) {
  const result = safeLookup(
    lookupData.new_benefit_group_ids,
    (e) => e.group_name.toLowerCase() === groupName.toLowerCase(),
    `Benefit group not found: "${groupName}"`
  );
  return {
    value: result.value ? String(result.value.new_benefit_group_id) : null,
    error: result.error,
  };
}

function lookupPtoPolicyId(policyName) {
  const result = safeLookup(
    lookupData.new_pto_policy_ids,
    (e) => e.policy_name.toLowerCase() === policyName.toLowerCase(),
    `PTO policy not found: "${policyName}"`
  );
  return { value: result.value?.new_pto_policy_id, error: result.error };
}

function lookupWorkLocationId(locationName) {
  const result = safeLookup(
    lookupData.new_work_location_ids,
    (e) => e.location_name.toLowerCase() === locationName.toLowerCase(),
    `Work location not found: "${locationName}"`
  );
  return { value: result.value?.new_work_location_id, error: result.error };
}

function lookupJobCode(positionTitle) {
  const result = safeLookup(
    lookupData.new_job_codes,
    (e) => e.position_title.toLowerCase() === positionTitle.toLowerCase(),
    `Job code not found for position: "${positionTitle}"`
  );
  return { value: result.value?.new_job_code, error: result.error };
}

// ============================================
// PAYLOAD GENERATION (collects ALL errors)
// ============================================

function generatePayload(employee) {
  const errors = [];

  const sourceLegalEntity = lookupLegalEntityPublicId(
    employee.currentEntity,
    "Source"
  );
  if (sourceLegalEntity.error) errors.push(sourceLegalEntity.error);

  const destLegalEntity = lookupLegalEntityPublicId(
    employee.destinationEntity,
    "Destination"
  );
  if (destLegalEntity.error) errors.push(destLegalEntity.error);

  const basePeoContractOid = lookupBasePeoContractOid(employee.employeeName);
  if (basePeoContractOid.error) errors.push(basePeoContractOid.error);

  const benefitGroup = lookupBenefitGroupId(employee.benefitGroup);
  if (benefitGroup.error) errors.push(benefitGroup.error);

  const ptoPolicy = lookupPtoPolicyId(employee.timeOffPolicy);
  if (ptoPolicy.error) errors.push(ptoPolicy.error);

  const workLocation = lookupWorkLocationId(employee.workLocation);
  if (workLocation.error) errors.push(workLocation.error);

  const jobCode = lookupJobCode(employee.jobTitle);
  if (jobCode.error) errors.push(jobCode.error);

  const team = lookupTeamId(employee.group);
  if (team.error) errors.push(team.error);

  const payrollSettings = lookupPayrollSettingsId(employee.payrollGroup);
  if (payrollSettings.error) errors.push(payrollSettings.error);

  if (errors.length > 0) {
    return { payload: null, errors };
  }

  return {
    payload: {
      organizationId: CONFIG.organizationId,
      requesterProfilePublicId: CONFIG.requesterProfilePublicId,
      sourceLegalEntityPublicId: sourceLegalEntity.value,
      destinationLegalEntityPublicId: destLegalEntity.value,
      effectiveDate: CONFIG.effectiveDate,
      agreementId: CONFIG.agreementId,
      basePeoContractOid: basePeoContractOid.value,
      newBenefitGroupId: benefitGroup.value,
      newPtoPolicyId: ptoPolicy.value,
      newWorkLocationId: workLocation.value,
      newJobCode: jobCode.value,
      newTeamId: team.value,
      newPayrollSettingsId: payrollSettings.value,
    },
    errors: [],
  };
}

// ============================================
// HTTP REQUEST FUNCTION
// ============================================

async function executeTransferRequest(payload, employeeName) {
  try {
    const response = await fetch(API_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": API_CONFIG.token,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return {
      employee: employeeName,
      success: response.ok,
      status: response.status,
      response: data,
    };
  } catch (error) {
    return {
      employee: employeeName,
      success: false,
      status: 0,
      error: error.message,
    };
  }
}

async function executeAllRequests(payloadsWithNames) {
  console.log("\n=== EXECUTING REQUESTS ===\n");

  const results = [];
  for (const { payload, employeeName } of payloadsWithNames) {
    console.log(`Processing: ${employeeName}...`);
    const result = await executeTransferRequest(payload, employeeName);
    results.push(result);

    if (result.success) {
      console.log(`  ✓ Success (${result.status})`);
    } else {
      console.log(`  ✗ Failed (${result.status})`);
    }
    console.log(
      `  Response: ${JSON.stringify(result.response || result.error, null, 2)}`
    );
    console.log("");
  }

  return results;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const payloadsWithNames = [];
  const allErrors = [];

  for (const employee of SPREADSHEET_DATA) {
    const result = generatePayload(employee);
    if (result.errors.length > 0) {
      allErrors.push({
        employee: employee.employeeName,
        errors: result.errors,
      });
    } else {
      payloadsWithNames.push({
        payload: result.payload,
        employeeName: employee.employeeName,
      });
    }
  }

  if (allErrors.length > 0) {
    console.error("\n=== VALIDATION ERRORS ===\n");
    for (const entry of allErrors) {
      console.error(`[${entry.employee}]`);
      for (const err of entry.errors) {
        console.error(`  - ${err}`);
      }
    }
    console.error("\n");
  }

  if (payloadsWithNames.length > 0) {
    console.log("\n=== GENERATED PAYLOADS ===\n");
    console.log(
      JSON.stringify(
        payloadsWithNames.map((p) => p.payload),
        null,
        2
      )
    );
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${SPREADSHEET_DATA.length}`);
  console.log(`Valid: ${payloadsWithNames.length}`);
  console.log(`Invalid: ${allErrors.length}`);

  // Execute requests if --request flag is provided
  if (shouldExecuteRequests) {
    if (API_CONFIG.token === "YOUR_AUTH_TOKEN_HERE") {
      console.error(
        "\n⚠️  ERROR: Please set your auth token in API_CONFIG.token before executing requests.\n"
      );
      process.exit(1);
    }

    if (payloadsWithNames.length === 0) {
      console.log("\n⚠️  No valid payloads to send.\n");
      return;
    }

    const results = await executeAllRequests(payloadsWithNames);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log("\n=== REQUEST RESULTS ===");
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log("\n=== FAILED REQUESTS ===\n");
      for (const f of failed) {
        console.log(`[${f.employee}] Status: ${f.status}`);
        console.log(`  ${f.error || JSON.stringify(f.response, null, 2)}`);
      }
    }

    if (successful.length > 0) {
      console.log("\n=== SUCCESSFUL RESPONSES ===\n");
      console.log(
        JSON.stringify(
          successful.map((s) => ({
            employee: s.employee,
            response: s.response,
          })),
          null,
          2
        )
      );
    }
  }
}

main();
