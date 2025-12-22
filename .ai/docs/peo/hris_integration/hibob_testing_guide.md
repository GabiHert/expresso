# HiBob Integration Testing Guide

## Overview

This guide provides step-by-step instructions for testing the PEO HRIS integration with HiBob. For each update domain, you'll find the specific locations in the HiBob platform where employee data can be modified to trigger updates in Deel's system.
  
> ## The update for the following fields are not working properly:
> ### Worker Identification
>
> - **workerId**  
>   - Not implemented in the code  
>
> ### Termination
>
> - **termination**  
>   - These updates are not working since termination details are not present in the employee object  
> - **employeeStatus**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **type**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **contractEndDate**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **terminationReason**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **terminationDate**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **rehireEligible**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **severanceAmount / severanceType**  
>   - Implemented but could not be tested since `terminationDetails` is not present  
> - **timeOffUnusedDays / considerations**  
>   - Implemented but could not be tested since `terminationDetails` is not present  

## Prerequisites

Before starting testing:

1. **HiBob Account Access**: Ensure you have admin access to the HiBob platform
2. **Deel PEO Contract**: Have an active PEO contract in Deel's system
3. **Integration Setup**: Confirm the HiBob integration is properly configured
4. **Test Employee**: Use a dedicated test employee for all testing scenarios

---

## 1. Demographic Information Updates

#### Processed Fields:

| Field Name | HiBob Location | Edit Process | Expected Deel Update | Notes |
|------------|----------------|--------------|---------------------|-------|
| **First Name** | Basic info → First Name | 1. Click "Edit" button<br>2. Modify first name<br>3. Click "Done" | Updates employee first name in Deel profile | Uses `employeeFirstName` field |
| **Last Name** | Basic info → Last Name | 1. Click "Edit" button<br>2. Modify last name<br>3. Click "Done" | Updates employee last name in Deel profile | Uses `employeeLastName` field |
| **Date of Birth** | Personal → Date of Birth | 1. Click "Edit" button<br>2. Select new date<br>3. Click "Done" | Updates birth date in Deel system | Uses `dob` field, transformed to YYYY-MM-DD format |
| **SSN** | Identification → SSN | 1. Click "Edit" button<br>2. Enter new SSN<br>3. Click "Done" | Updates SSN in Deel system | Uses `ssn` field, removes non-digits |

---

## 2. Job Data Updates

### HiBob Location: Employee Profile → Job Information

#### Processed Fields:

| Field Name | HiBob Location | Edit Process | Expected Deel Update | Notes |
|------------|----------------|--------------|---------------------|-------|
| **First Name** | Basic info → First Name | 1. Click "Edit" button<br>2. Modify first name<br>3. Click "Done" | Updates employee first name in Deel profile | Uses `employeeFirstName` field |
| **Last Name** | Basic info → Last Name | 1. Click "Edit" button<br>2. Modify last name<br>3. Click "Done" | Updates employee last name in Deel profile | Uses `employeeLastName` field |
| **Job Title** | Work → Work → Job Title | 1. Click "Edit" button<br>2. Modify job title<br>3. Click "Done" | Updates job title in Deel contract and profile | Uses `jobTitle` field |
| **Department** | Work → Work → Department | 1. Click "Edit" button<br>2. Select department<br>3. Click "Done" | Updates department in Deel system | Uses `department` field (array) |
| **Personal Email** | Personal contact details → Personal Email | 1. Click "Edit" button<br>2. Enter new email<br>3. Click "Done" | Updates personal email in Deel profile | Uses `personalEmail` field |
| **Employee Address** | Address → Address | 1. Click "Edit" button<br>2. Modify address fields<br>3. Click "Done" | Updates address in Deel system | Uses `employeeAddress` object (city, zip, street, geoCode) |

---

## 3. Compensation Updates

#### Processed Fields:

| Field Name | HiBob Location | Edit Process | Expected Deel Update | Notes |
|------------|----------------|--------------|---------------------|-------|
| **Pay Type** | Employment → Employment → Salary Pay Type | 1. Click "Edit" button<br>2. Change to Salary/Hourly<br>3. Click "Done" | Updates pay method in Deel | Uses `payType` field (HOUR → HOURLY) |
| **Weekly Hours** | Employment → Employment → Weekly Hours | 1. Click "Edit" button<br>2. Modify hours<br>3. Click "Done" | Updates work hours in Deel | Uses `weeklyHours` field |
| **Change Reason** | Employment → Employment → Reason | 1. Click "Edit" button<br>2. Enter reason<br>3. Click "Done" | Updates change reason in Deel | Uses `changeReason` field |

---

## 4. Bank Information Updates

#### Processed Fields:

| Field Name | HiBob Location | Edit Process | Expected Deel Update | Notes |
|------------|----------------|--------------|---------------------|-------|
| **Account Number** | Financial → Account Number | 1. Click "Edit" button<br>2. Enter new account number<br>3. Click "Done" | Updates bank account in Deel | Uses `accountNumber` field |
| **Routing Number** | Financial → Routing Number | 1. Click "Edit" button<br>2. Enter new routing number<br>3. Click "Done" | Updates routing number in Deel | Uses `routingNumber` field |
| **Bank Name** | Financial → Bank Name | 1. Click "Edit" button<br>2. Enter bank name<br>3. Click "Done" | Updates bank name in Deel | Uses `bankName` field |
| **Account Type** | Financial → Account Type | 1. Click "Edit" button<br>2. Select Checking/Savings<br>3. Click "Done" | Updates account type in Deel | Uses `accountType` field (CHECKING → CASH) |

---

## Local test mocks
The following methods can be replaced at `PeoHrisIntegrationService` class to mock some external services calls.

- `_filterIntegrations`
```
    async _filterIntegrations(integrations) {
        return integrations.filter((x) =>
            [
                integrationsService.INTEGRATION_SLUG.BAMBOOHR,
                integrationsService.INTEGRATION_SLUG.HIBOB,
                integrationsService.INTEGRATION_SLUG.WORKDAY_GPC,
            ].includes(x.slug)
        );
    }
```
- `getOrganizationIntegrations`
```   
   async getOrganizationIntegrations({organizationId, shouldFilterIntegrations = true}) {
        // const integrations = await integrationsService.getOrganizationIntegrations(organizationId);

        // if (shouldFilterIntegrations) return this._filterIntegrations(integrations);

        //return integrations;

        return JSON.parse(`[
            {
                "id": "d17d252d-10c4-4b77-b57d-a8fee405062a",
                "name": "BambooHR",
                "logoUrl": "https://media.letsdeel.com/images/integrations/bamboohr.svg",
                "schemaId": "b4d99906-a493-4c1d-a383-cbdc1395ee23",
                "type": "DEEL_HR",
                "slug": "bamboohr",
                "syncStatus": "FINISHED",
                "isActive": true,
                "settings": {
                    "company": "deelpartnertest",
                    "host": "deelpartnertest.bamboohr.com",
                    "onboardingGPPlugin": {
                        "isEnabled": true,
                        "isAutoSyncEnabled": false,
                        "payGroupsMapping": [
                            {
                                "teamId": 268405,
                                "legalEntityId": 224762,
                                "isSyncEnabled": true,
                                "payGroupId": "1",
                                "testSyncStatus": "FINISHED"
                            }
                        ],
                        "mappingFields": [
                            {
                                "deelId": "employeeNumber",
                                "hrId": "636"
                            },
                            {
                                "deelId": "name",
                                "hrId": "1"
                            },
                            {
                                "deelId": "country",
                                "hrId": "3991"
                            },
                            {
                                "deelId": "addressLine1",
                                "hrId": "8"
                            },
                            {
                                "deelId": "addressLine2",
                                "hrId": "9"
                            },
                            {
                                "deelId": "dob",
                                "hrId": "6"
                            },
                            {
                                "deelId": "city",
                                "hrId": "10"
                            },
                            {
                                "deelId": "homePhone",
                                "hrId": "14"
                            },
                            {
                                "deelId": "firstName",
                                "hrId": "1"
                            },
                            {
                                "deelId": "lastName",
                                "hrId": "2"
                            },
                            {
                                "deelId": "maritalStatus",
                                "hrId": "155"
                            },
                            {
                                "deelId": "middleName",
                                "hrId": "5"
                            },
                            {
                                "deelId": "mobilePhone",
                                "hrId": "13"
                            },
                            {
                                "deelId": "preferredName",
                                "hrId": "1358"
                            },
                            {
                                "deelId": "state",
                                "hrId": "11"
                            },
                            {
                                "deelId": "workEmail",
                                "hrId": "15"
                            },
                            {
                                "deelId": "zip",
                                "hrId": "12"
                            },
                            {
                                "deelId": "compensationRate",
                                "hrId": "19"
                            },
                            {
                                "deelId": "compensationCurrency",
                                "hrId": "19"
                            },
                            {
                                "deelId": "compensationComments",
                                "hrId": "4045"
                            },
                            {
                                "deelId": "compensationEffectiveDate",
                                "hrId": "4021"
                            },
                            {
                                "deelId": "compensationOverRate",
                                "hrId": "4403"
                            },
                            {
                                "deelId": "compensationOverCurrency",
                                "hrId": "4403"
                            },
                            {
                                "deelId": "compensationOverStatus",
                                "hrId": "4042"
                            },
                            {
                                "deelId": "compensationPaidPer",
                                "hrId": "4330"
                            },
                            {
                                "deelId": "compensationPayType",
                                "hrId": "156"
                            },
                            {
                                "deelId": "startDate",
                                "hrId": "3"
                            },
                            {
                                "deelId": "fte",
                                "hrId": "16.1"
                            },
                            {
                                "deelId": "originalStartDate",
                                "hrId": "4333"
                            },
                            {
                                "deelId": "employmentComments",
                                "hrId": "4046"
                            },
                            {
                                "deelId": "employmentEffectiveDate",
                                "hrId": "1936"
                            },
                            {
                                "deelId": "jobEffectiveDate",
                                "hrId": "4047"
                            },
                            {
                                "deelId": "vacationStartDate",
                                "hrId": "4357.8"
                            },
                            {
                                "deelId": "department",
                                "hrId": "4"
                            },
                            {
                                "deelId": "division",
                                "hrId": "1355"
                            },
                            {
                                "deelId": "employmentType",
                                "hrId": "16"
                            },
                            {
                                "deelId": "jobTitle",
                                "hrId": "17"
                            },
                            {
                                "deelId": "location",
                                "hrId": "18"
                            },
                            {
                                "deelId": "compensationSchedule",
                                "hrId": "4386"
                            },
                            {
                                "deelId": "terminationType",
                                "hrId": "4314"
                            },
                            {
                                "deelId": "terminationReason",
                                "hrId": "4314"
                            },
                            {
                                "deelId": "needWorkVisa",
                                "hrId": "4170"
                            },
                            {
                                "deelId": "vacationYearlyAllowance",
                                "hrId": "4370"
                            }
                        ]
                    },
                    "syncStatus": "FINISHED",
                    "syncStartedAt": "2024-07-09T12:30:05.979Z",
                    "deelScimToken": {
                        "id": "45a4426c-8474-42ee-9bce-8db911e3f3b6",
                        "status": "ACTIVE",
                        "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRfaWQiOiI0NWE0NDI2Yy04NDc0LTQyZWUtOWJjZS04ZGI5MTFlM2YzYjYiLCJvcmdhbml6YXRpb25faWQiOiIxNTkzMjciLCJwcm9maWxlX2lkIjoiMTI2MDU5OCIsInVzZXJfaWQiOiIxMjExMTg5Iiwic2NvcGUiOiJVc2VyczpyZWFkIiwidG9rZW5fdHlwZSI6Im9yZ2FuaXphdGlvbiIsImhpZGRlbiI6dHJ1ZSwiaW50ZWdyYXRpb24iOiJCQU1CT09IUiIsImlhdCI6MTcxOTg1NDE2NCwiaXNzIjoiZGVlbC1pbnRlZ3JhdGlvbnMifQ.KPSTE4DzrvLGenQj1yKClvxU-wgIsCI4oSs8MwXh17azebhB64BQPTWd2cpuC8APRR6avQizrxkckMNth3DqI3d8M5v9tXkxZ1ZeXaVBU1vGdSKZefTskXaPhZcdYPWfXnzOZOJiRPpVSIBpP8dn6lAEMVPfuuFzyDvOzbqd5MXLeXXu1v4gJeBh7LLh0UmJluPQxABTXgWkbkftATO1JnBBX_OnrEnEpMRZTuhsr0AGq6vvfm6lpcKs9RBASN3BuemB0GFvahDF4eaboTYHZ5uYU3mvGjDikeYU6Kt-JhkMz1sT90VXXRZVEqkoZcmRJqXGa2V9VUjS6o256Si1LPAqfyRdWXdyOcLyeuqfmYXE3y_svURBsC2C7U0hJLv0G1kRB14QxtzbdsNbrW1UPX_U1KHysQ1U0PpHyF1khT2bCUym1xGs9ia3Fb8H3dNgXj_GcI5myUGPcJ2g8czwwrXNlug_2OiGqzHZrvWqPYJ3hR6RxkkJ_JnGpulr2Sgp",
                        "organizationId": "159327",
                        "profileId": "1260598",
                        "userId": "1211189",
                        "label": "BAMBOOHR deelScimToken - 2024-07-01",
                        "scope": "Users:read",
                        "hidden": true,
                        "tokenType": "organization",
                        "integration": "BAMBOOHR",
                        "updatedAt": "2024-07-01T17:16:04.987Z",
                        "createdAt": "2024-07-01T17:16:04.959Z",
                        "expiresAt": null
                    },
                    "getPeopleToken": {
                        "id": "30d7788c-683c-47b5-8240-38ffea3fd67b",
                        "status": "ACTIVE",
                        "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRfaWQiOiIzMGQ3Nzg4Yy02ODNjLTQ3YjUtODI0MC0zOGZmZWEzZmQ2N2IiLCJvcmdhbml6YXRpb25faWQiOiIxNTkzMjciLCJwcm9maWxlX2lkIjoiMTI2MDU5OCIsInVzZXJfaWQiOiIxMjExMTg5Iiwic2NvcGUiOiJwZW9wbGU6cmVhZCIsInRva2VuX3R5cGUiOiJvcmdhbml6YXRpb24iLCJoaWRkZW4iOnRydWUsImludGVncmF0aW9uIjoiQkFNQk9PSFIiLCJpYXQiOjE3MTk4NTQxNjUsImlzcyI6ImRlZWwtaW50ZWdyYXRpb25zIn0.QUHN9EfobKupYyyLnq7cU61g2WRJo3PAuoOOsnrGEfakfRWvcZtxsxXa38nz5xMLO9gg0VwBAJ3sEipep5-gCrLW9NQJGxyBa0usMHf-MkC_lQWij5qR88Ituxt6FhOjNOI0mK0rp2O-hHLPDAW6U7pInCKHBo3QXRGpkiQb-padl3j-oSGVyvS32tWzIZQIMhZ07Npo-ZPc91l3HDaJLcHSN4zBFKEH6aevFzxrPeAaCJPHJH_jSmDeHwvZFZP2aqUzU3oYUjXDm8Apou8VBmSPgRKSKpaWIe2MTu-mDKaK9oABh5k_EeHXnV6oaTXTW-b9el_28EL28mDgkFrgaKHxkL34_7iJjq1jZ988M3DtHeifSVvgG0kzD0eRPYMCsqV-XS7Pt4MJ88HCXRldXDGs5IfbjmQWUJ6yzGT9IVQp-opyCVYZxGvrEPgI7jjrt4UqjYZB87WFBMLlxz1YOchUA0xCQlHdJD9SZHKCjLlHgDr5ENCN2bWzVp3oslxw",
                        "organizationId": "159327",
                        "profileId": "1260598",
                        "userId": "1211189",
                        "label": "BAMBOOHR getPeopleToken - 2024-07-01",
                        "scope": "people:read",
                        "hidden": true,
                        "tokenType": "organization",
                        "integration": "BAMBOOHR",
                        "updatedAt": "2024-07-01T17:16:05.013Z",
                        "createdAt": "2024-07-01T17:16:05.005Z",
                        "expiresAt": null
                    },
                    "getManagerToken": {
                        "id": "a0ca6773-4877-447a-840b-9b445ecf90c8",
                        "status": "ACTIVE",
                        "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRfaWQiOiJhMGNhNjc3My00ODc3LTQ0N2EtODQwYi05YjQ0NWVjZjkwYzgiLCJvcmdhbml6YXRpb25faWQiOiIxNTkzMjciLCJwcm9maWxlX2lkIjoiMTI2MDU5OCIsInVzZXJfaWQiOiIxMjExMTg5Iiwic2NvcGUiOiJvcmdhbml6YXRpb25zOnJlYWQiLCJ0b2tlbl90eXBlIjoib3JnYW5pemF0aW9uIiwiaGlkZGVuIjp0cnVlLCJpbnRlZ3JhdGlvbiI6IkJBTUJPT0hSIiwiaWF0IjoxNzE5ODU0MTY1LCJpc3MiOiJkZWVsLWludGVncmF0aW9ucyJ9.g7NozCfgbmZkQgQlo_G0Eu4WxZP3efy3sAONO3g82_yNrocYisEjPqQwrylFzJYTX3oCB0UKw9eWJ82HcHRbtyTM1qppxmUM4KbmNBfILfxO5OF81mu8b8HMl6DLvkbM8tW-Luo_yW7SkjSag6W55ekR3eoV-I05fgV0nMiXEVg-GvlTiNh-46TvZ7KgL504kLufVANDD0jBLur9l7kUtRMVBntk0DCZeyt_7MfAr-7pExF2FCqJ0VICnBnraEseWZYixtL3OFRVhjdq-L0Mfawz_l1RwZqgZM3S05bxKwvPMBgwkxNeJM4mYNKbCT_GDU6LW2w_6ZvXsvr1XPqVTSoRgdoJr7D5_KtaxNMffOnNxYhJn4w6rQubMuCgRgVmQAmabDVHJRyXKv1w-hvkZdpgiF5xzNxfUZQgOaYOnr8oy6Z7LYFj2H5q5fjLsAj8IZ3Pzqbh5cEfFjr1oKq0dJArt8MO7CEmKHY_vs8cClhc2jnvq8v5MVQqUuQmRM7V",
                        "organizationId": "159327",
                        "profileId": "1260598",
                        "userId": "1211189",
                        "label": "BAMBOOHR getManagerToken - 2024-07-01",
                        "scope": "organizations:read",
                        "hidden": true,
                        "tokenType": "organization",
                        "integration": "BAMBOOHR",
                        "updatedAt": "2024-07-01T17:16:05.068Z",
                        "createdAt": "2024-07-01T17:16:05.036Z",
                        "expiresAt": null
                    },
                    "syncedAt": "2024-07-09T12:30:11.077Z",
                    "timeOffPlugin": {},
                    "timeOffGPPlugin": {
                        "legalEntities": {
                            "224762": {
                                "typeMapping": {
                                    "c03d3f638d1ba4653be8b3a3c9bdaf": [
                                        "87"
                                    ],
                                    "c20613ea4b303422fb4c16ae06230f": [
                                        "77"
                                    ],
                                    "c217bef5203ae49bbb0073b8fcc7a2": [
                                        "90"
                                    ],
                                    "c6348ff1534ff479085c068fa9b774": [],
                                    "c6ffe04fb8c4a4af0806fa1c18421e": [],
                                    "c8ee14235b3fe4e929f70b65626649": [
                                        "78"
                                    ],
                                    "c9adbfd9db1bb4b608fba22d3d85b9": [],
                                    "c9b7ae83be5ec4845b4820936d92dd": [],
                                    "cb1de0f4392d74e4b9e41360ded179": [],
                                    "cb2bfb09833fc46d0a9e58e847f162": [
                                        "91"
                                    ],
                                    "cbc83097fc28843b7a0ee7bfe1492d": [],
                                    "cd316fd60857a4b98b6ce85c9d9ab5": [
                                        "79"
                                    ],
                                    "cd3dbf7b4d273470687921d0669aac": [],
                                    "clbgv7klg80365001wcfk9mtjb5": [],
                                    "clbgv8dm381916801wcgz1b4ikn": [],
                                    "clbgvbh7w82536901wcm3e2x8qr": [],
                                    "clbgvc4ai82592701wcwd02531w": [],
                                    "clbgvcnff83583501wcv5c243ye": [],
                                    "clbgvdw2586194401wcaqarfdsu": [],
                                    "clbgvyiqv91357201wcq0qomy83": [],
                                    "clbgvzksm91495801wcditdcnuz": [
                                        "82"
                                    ],
                                    "clbgw4cn792143901wczjmz8qf4": [],
                                    "cli44d3rz22262701vogwglvbow": [],
                                    "cljpnknak00cztt0118xq52vq": [],
                                    "cll3rslta00fwxh01kmqjvlkr": [],
                                    "clnaorzma0051z2019hr76idv": [],
                                    "clnm9b8e50075v301oqf7cy3r": [],
                                    "clnm9bq7m0078v301xoifgo5f": [],
                                    "clnncdtrs00h6vz01rxlamq4x": [],
                                    "clran9nzs01ajxo01zeba0gir": [],
                                    "clsaix5ci07ejvz017vkljr31": [],
                                    "clt5ys3j30oz7v301g1emzpeb": [],
                                    "cltidwy3i0duo1t01d8i9u7rt": [],
                                    "cltidxio4001hzd01krb0u4a4": [],
                                    "cltidy8di0dux1t01jyrpl4bo": [],
                                    "cltidyup6001pzd01nh7yf98g": [],
                                    "cltidzjdy001uzd01nmpi6fbl": [],
                                    "cltie02ib0dvj1t019l576eeo": [],
                                    "cltie8mwv07180a01wwnsy0ps": [],
                                    "cltie9jvl0dxv1t01859em65l": []
                                },
                                "isSyncEnabled": true
                            }
                        },
                        "isEnabled": true
                    },
                    "documentsPlugin": {},
                    "autoSyncPayslipGPPlugin": {},
                    "infoAutoSyncPlugin": {
                        "autoSyncPlugin": {
                            "enabledAt": "2024-07-01T17:19:54.439Z",
                            "isEnabled": true,
                            "isFixedEnabled": true,
                            "isEOREnabled": true
                        }
                    },
                    "otpGPPlugin": {
                        "isEnabled": false,
                        "legalEntities": {}
                    }
                },
                "createdAt": "2024-07-01T17:15:44.657Z"
            }
        ]`);
    }
```
- `getEmployeesByIntegration`
```
async getEmployeesByIntegration(
        integrationId,
        organizationId,
        cursor,
        minEmployeeByPage = 5,
        shouldFilterExistEEs = true,
        shouldReturnOnlyExistEEs = false
    ) {
        let lastCursor = cursor || null;
        const employees = [];
        //const peoContracts = null;
        const peoContracts = []; //await this.getExistingEmployeesLinkedWithIntegrationByOrganization(organizationId);

        do {
            try {
                const response = JSON.parse(`{
                    "cursor": null,
                    "data": [
                            {
                            "providerId": "2326564221456",
                            "firstName": "Jane",
                            "middleName": "A.",
                            "lastName": "Doe",
                            "personalEmail": "jane.doe@example.com",
                            "nationality": "US",
                            "country": "USA",
                            "zipCode": "94105",
                            "state": "CA",
                            "city": "San Francisco",
                            "address": "123 Market Street",
                            "addressComplement": "Apt 5B",
                            "gender": "Female",
                            "birthDate": "1990-06-15",
                            "ssn": "123-45-6789",
                            "workLocation": "San Francisco HQ",
                            "seniority": "Senior",
                            "manager": {
                                "providerId": "mgr_101",
                                "name": "John Smith",
                                "email": "john.smith@example.com"
                            },
                            "jobTitle": "Senior Software Engineer",
                            "jobDescription": "Lead backend developer on payroll systems",
                            "employmentStatus": "Active",
                            "employmentType": "FULL_TIME",
                            "payType": "MONTH",
                            "payRate": "100000",
                            "payCurrency": "USD",
                            "workSchedule": null,
                            "weeklyHours": "40",
                            "createdAt": "2023-01-01T09:00:00Z",
                            "hireDate": "2023-01-01",
                            "startDate": "2023-01-15",
                            "updatedAt": "2024-03-01T12:00:00Z",
                            "workEmail": "jane.doe@company.com",
                            "terminationDate": null,
                            "department": "Engineering",
                            "groups": [
                                {
                                "type": "TEAM",
                                "name": "Backend",
                                "providerId": "group_101"
                                }
                            ],
                            "bankInfo": [
                                {
                                "id": "bank_001",
                                "createdAt": "2023-01-01T09:00:00Z",
                                "updatedAt": "2023-01-01T09:00:00Z",
                                "effectiveDate": "2023-01-15",
                                "accountNumber": "9876543210",
                                "routingNumber": "111000025",
                                "bankName": "Bank of Example",
                                "accountType": "CHECKING"
                                }
                            ],
                            "employments": [
                                {
                                "providerId": "21431",
                                "effectiveDate": null,
                                "createdAt": null,
                                "updatedAt": null,
                                "employmentType": "FULL_TIME",
                                "payType": "MONTH",
                                "payRate": null,
                                "baseHourlyRate": null,
                                "weeklyHours": "40",
                                "paymentFrequency": null,
                                "hireDate": "2016-06-01",
                                "hiredAt": "2016-06-01T07:00:00.000Z",
                                "startDate": "2016-06-01",
                                "startsAt": "2016-06-01T07:00:00.000Z",
                                "terminationDetails": null
                                }
                            ],
                            "jobs": [
                                {
                                "effectiveDate": null,
                                "endDate": null,
                                "jobTitle": "Business Analyst",
                                "department": ["FA-Financial Analysis", "Executive Management"],
                                "division": ["FA-Financial Analysis", "Executive Management"],
                                "workLocation": "San Francisco",
                                "seniority": "8_Individual_Contributor",
                                "allocationPercentage": 1,
                                "manager": {
                                    "providerId": "21002",
                                    "name": "Steve Morgan",
                                    "email": null
                                }
                                },
                                {
                                "effectiveDate": null,
                                "endDate": null,
                                "jobTitle": "Head of Product",
                                "department": "SV - Consulting Services",
                                "division": "SV - Consulting Services",
                                "workLocation": "Boston",
                                "seniority": "8_Individual_Contributor",
                                "allocationPercentage": 0,
                                "manager": {
                                    "providerId": "21001",
                                    "name": "Logan McNeil",
                                    "email": null
                                }
                                }
                            ],
                        "compensations": [
                            {
                                "effectiveDate": null,
                                "createdAt": null,
                                "endDate": null,
                                "changeReason": "Promotion_Promotion_Promotion",
                                "components": [
                                    {
                                    "name": null,
                                    "payType": "MONTH",
                                    "value": "27862.17",
                                    "currency": "USD",
                                    "paymentNature": "RECURRING",
                                    "paymentFrequency": null
                                    },
                                    {
                                    "name": null,
                                    "payType": "YEAR",
                                    "value": "334346",
                                    "currency": "USD",
                                    "paymentNature": "RECURRING",
                                    "paymentFrequency": null
                                    }
                                ]
                                },
                                {
                                "effectiveDate": "2025-05-28",
                                "createdAt": null,
                                "endDate": null,
                                "changeReason": "Add_Additional_Employee_Job_New_Assignment_New_Position",
                                "components": [
                                    {
                                    "name": null,
                                    "payType": "MONTH",
                                    "value": "40510.25",
                                    "currency": "USD",
                                    "paymentNature": "RECURRING",
                                    "paymentFrequency": null
                                    },
                                    {
                                    "name": null,
                                    "payType": "YEAR",
                                    "value": "486123",
                                    "currency": "USD",
                                    "paymentNature": "RECURRING",
                                    "paymentFrequency": null
                                    }
                                ]
                                }
                            ],
                            "payrollGroup": [
                                {
                                "id": "pg_001",
                                "name": "US Monthly Payroll",
                                "effectiveDate": "2023-01-15"
                                }
                            ]
                        }
                    ]
                }`);

                //const response = await hrisProvidersService.getProviderUsers(integrationId, {cursor: lastCursor});

                let hrisEmployees = [];
                const validEmployees = [];

                for (const employee of response?.data || []) {
                    const isValid = await this._checkHrisIntegrationEmployeeIsValid(employee, integrationId);
                    if (isValid) {
                        validEmployees.push(employee);
                    }
                }

                for (const employee of validEmployees) {
                    const mappedEmployee = await this._mapHrisIntegrationDataToContractData(employee, organizationId);
                    hrisEmployees.push(mappedEmployee);
                }

                if (hrisEmployees && peoContracts && peoContracts.length > 0) {
                    if (shouldFilterExistEEs) {
                        hrisEmployees = hrisEmployees?.filter((item) => !this._checkHrisIntegrationEmployeeAlreadyExists(item, peoContracts)) ?? [];
                    } else if (shouldReturnOnlyExistEEs) {
                        hrisEmployees = hrisEmployees?.filter((item) => this._checkHrisIntegrationEmployeeAlreadyExists(item, peoContracts)) ?? [];
                    }
                }

                employees.push(...hrisEmployees);

                if (!response || !response.cursor) break;
                lastCursor = response.cursor;

                if (minEmployeeByPage && employees.length > minEmployeeByPage) {
                    break;
                }
            } catch (err) {
                this.log.error({
                    msg: `Failed to retrieve employees by integration ${integrationId}`,
                    err,
                });
                break;
            }
        } while (lastCursor);

        return {
            employees,
            cursor: lastCursor,
        };
    }

```

## Test Results Template

### Test Session Information
- **Date**: [Date]
- **Tester**: [Name]
- **HiBob Environment**: [Production/Staging]
- **Deel Environment**: [Production/Staging]

### Test Results by Domain

#### Demographic Information Updates
- [ ] First Name: [Pass/Fail] - [Notes]
- [ ] Last Name: [Pass/Fail] - [Notes]
- [ ] Date of Birth: [Pass/Fail] - [Notes]
- [ ] SSN: [Pass/Fail] - [Notes]

#### Job Data Updates
- [ ] First Name: [Pass/Fail] - [Notes]
- [ ] Last Name: [Pass/Fail] - [Notes]
- [ ] Job Title: [Pass/Fail] - [Notes]
- [ ] Department: [Pass/Fail] - [Notes]
- [ ] Work Location: [Pass/Fail] - [Notes]
- [ ] Personal Email: [Pass/Fail] - [Notes]
- [ ] Work Email: [Pass/Fail] - [Notes]
- [ ] Personal Phone: [Pass/Fail] - [Notes]
- [ ] Employee Address: [Pass/Fail] - [Notes]

#### Compensation Updates
- [ ] Effective Date: [Pass/Fail] - [Notes]
- [ ] Employment Type: [Pass/Fail] - [Notes]
- [ ] Pay Rate: [Pass/Fail] - [Notes]
- [ ] Pay Type: [Pass/Fail] - [Notes]
- [ ] Weekly Hours: [Pass/Fail] - [Notes]
- [ ] Change Reason: [Pass/Fail] - [Notes]

#### Bank Information Updates
- [ ] Account Number: [Pass/Fail] - [Notes]
- [ ] Routing Number: [Pass/Fail] - [Notes]
- [ ] Bank Name: [Pass/Fail] - [Notes]
- [ ] Account Type: [Pass/Fail] - [Notes]

#### Termination Processing
- [ ] Termination Type: [Pass/Fail] - [Notes]
- [ ] Contract End Date: [Pass/Fail] - [Notes]
- [ ] Termination Reason: [Pass/Fail] - [Notes]
- [ ] Termination Date: [Pass/Fail] - [Notes]
- [ ] Rehire Eligibility: [Pass/Fail] - [Notes]
- [ ] Severance Amount: [Pass/Fail] - [Notes]
- [ ] Severance Type: [Pass/Fail] - [Notes]
- [ ] Unused Time Off: [Pass/Fail] - [Notes]
- [ ] Considerations: [Pass/Fail] - [Notes]

### Overall Assessment
- **Total Tests**: [Number]
- **Passed**: [Number]
- **Failed**: [Number]
- **Success Rate**: [Percentage]

### Issues Found
1. [Issue description]
2. [Issue description]
3. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
3. [Recommendation]

---

*This testing guide should be updated as the integration evolves and new features are added.*

---

## Related Documentation

- [Main HRIS Integration Documentation](README.md)
- [Testing Endpoints Guide](testing_endpoints.md)
- [Module Overview](module_overview.md)

---

_Created: 2025-12-18_  
_Last Updated: 2025-12-18_  
_Maintained By: PEO Engineering Team_
