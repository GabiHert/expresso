# Entity Transfer API Endpoint (Updated)

This document describes the entity transfer API endpoint after PEOCM-660 and PEOCM-823 implementations.

## POST /peo_integration/legal_entities/entity_transfer

Creates a new bulk transfer request to move employees between legal entities.

### Key Changes from Previous Version

**PEOCM-823:**
- ✅ Changed `newJobCode` → `newPositionPublicId` (UUID)
- ✅ Changed `jobCode` → `positionPublicId` in response

**PEOCM-660:**
- ✅ Fixed type mismatches (payGroupId, ptoPolicyId, workLocationId, etc.)
- ✅ Updated signature structure with proper roles and agreement types
- ✅ Changed `peoContractId` → `peoContractOid` (string identifier)

---

## Request

### Request Body

```json
{
  "sourceLegalEntityPublicId": "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10",
  "destinationLegalEntityPublicId": "6569739c-33d5-4897-82f5-5284d2b17e71",
  "effectiveDate": "2025-02-01",
  "contracts": [
    {
      "peoContractOid": "EMP12345",
      "newBenefitGroupId": "400",
      "newPayGroupId": "cmj1mkiml01to01cngrnz3z1h",
      "newPtoPolicyId": "7422d56a-a372-46c5-adbd-9463d16d58cb",
      "newWorkLocationId": "1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6",
      "newPositionPublicId": "f6355dbb-861d-45e2-9c55-b206ad4c7647",
      "newTeamId": 205923
    }
  ],
  "additionalSignerProfilePublicIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  ]
}
```

### Request Body Parameters

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `sourceLegalEntityPublicId` | UUID | Yes | Legal entity employees are leaving | `"13c44a93-cf52-4dd3-a1ba-cf8e8404cd10"` |
| `destinationLegalEntityPublicId` | UUID | Yes | Legal entity employees are joining | `"6569739c-33d5-4897-82f5-5284d2b17e71"` |
| `effectiveDate` | DATE | Yes | When the transfer takes effect (YYYY-MM-DD) | `"2025-02-01"` |
| `contracts` | Array | Yes | List of employee contracts to transfer | See contract object below |
| `additionalSignerProfilePublicIds` | UUID[] | No | Additional admin signers (beyond requester) | `["uuid1", "uuid2"]` |

### Contract Object Parameters

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `peoContractOid` | VARCHAR(20) | Yes | Current employee contract OID | `"EMP12345"` |
| `newBenefitGroupId` | VARCHAR(10) | Yes | Destination benefit group (Prism group ID) | `"400"` |
| `newPayGroupId` | TEXT | Yes | Destination payroll settings ID (nanoid/CUID) | `"cmj1mkiml01to01cngrnz3z1h"` |
| `newPtoPolicyId` | UUID | Yes | Destination PTO policy | `"7422d56a-a372-46c5-adbd-9463d16d58cb"` |
| `newWorkLocationId` | UUID | Yes | Destination work location | `"1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6"` |
| `newPositionPublicId` | UUID | Yes | **⚠️ PEOCM-823** Destination position UUID | `"f6355dbb-861d-45e2-9c55-b206ad4c7647"` |
| `newTeamId` | INTEGER | No | Destination team assignment | `205923` |

### Breaking Changes

**❌ REMOVED:** `newJobCode` (VARCHAR)
**✅ ADDED:** `newPositionPublicId` (UUID)

**Reason:** Positions in underwriting don't have a Prism code yet. The backend resolves position UUID → code at processing time.

---

## Response

### Response: 201 Created

```json
{
  "transfer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "DRAFT",
    "organizationId": 106252,
    "requesterPublicProfileId": "bfad0491-eca1-4857-ac9a-7e30002a44d4",
    "sourceLegalEntity": {
      "publicId": "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10",
      "legalName": "Deel PEO - California",
      "countryId": 233
    },
    "destinationLegalEntity": {
      "publicId": "6569739c-33d5-4897-82f5-5284d2b17e71",
      "legalName": "Deel PEO - Texas",
      "countryId": 233
    },
    "effectiveDate": "2025-02-01",
    "items": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "peoContractOid": "EMP12345",
        "employeeName": "John Doe",
        "employeeEmail": "john.doe@company.com",
        "status": "PENDING",
        "benefitGroupId": "400",
        "payGroupId": "cmj1mkiml01to01cngrnz3z1h",
        "ptoPolicyId": "7422d56a-a372-46c5-adbd-9463d16d58cb",
        "workLocationId": "1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6",
        "positionPublicId": "f6355dbb-861d-45e2-9c55-b206ad4c7647",
        "teamId": 205923,
        "newContractOid": null,
        "resumeFromStep": null
      }
    ],
    "signatures": {
      "admins": [
        {
          "publicProfileId": "99b7c17f-3420-4a50-b7d2-58c8c8940f6b",
          "name": "Sarah Chen",
          "email": "sarah.chen@company.com",
          "role": "ADMIN",
          "agreementType": "ENTITY_ASSIGNMENT_AGREEMENT",
          "status": "AWAITING_SIGNATURE",
          "signedAt": null
        }
      ],
      "employees": [
        {
          "publicProfileId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "name": "John Doe",
          "email": "john.doe@company.com",
          "jobTitle": "Software Developer",
          "role": "EMPLOYEE",
          "agreementType": "ENTITY_ASSIGNMENT_AGREEMENT",
          "status": "AWAITING_SIGNATURE",
          "signedAt": null
        }
      ]
    },
    "agreementId": "d4e5f6a7-b8c9-0123-4567-890abcdef123",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "agreement": {
    "id": "d4e5f6a7-b8c9-0123-4567-890abcdef123",
    "pdfUrl": "https://s3.amazonaws.com/deel-documents/agreements/preview-agreement-2025.pdf",
    "type": "PREVIEW",
    "expiresAt": "2025-01-15T10:45:00Z"
  }
}
```

### Response Fields

#### Transfer Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique transfer identifier |
| `status` | ENUM | Transfer status (see enum values below) |
| `organizationId` | INTEGER | Organization ID (client company) |
| `requesterPublicProfileId` | UUID | Profile public_id of admin who initiated transfer |
| `sourceLegalEntity` | Object | Legal entity employees are leaving |
| `destinationLegalEntity` | Object | Legal entity employees are joining |
| `effectiveDate` | DATE | When the transfer takes effect (YYYY-MM-DD) |
| `items` | Array | List of individual employee transfer items |
| `signatures` | Object | Signature tracking for admins and employees |
| `agreementId` | UUID | Reference to agreement document |
| `createdAt` | TIMESTAMP | Transfer creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### Transfer Item Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique transfer item identifier |
| `peoContractOid` | VARCHAR(20) | **⚠️ PEOCM-660** Employee contract OID (string, not UUID) |
| `employeeName` | STRING | Employee full name |
| `employeeEmail` | STRING | Employee email address |
| `status` | ENUM | Item status (see enum values below) |
| `benefitGroupId` | VARCHAR(10) | Benefit group Prism ID (e.g., "400", "600") |
| `payGroupId` | TEXT | **⚠️ PEOCM-660** Payroll settings ID (nanoid/CUID format) |
| `ptoPolicyId` | UUID | **⚠️ PEOCM-660** PTO policy UUID |
| `workLocationId` | UUID | **⚠️ PEOCM-660** Work location UUID |
| `positionPublicId` | UUID | **⚠️ PEOCM-823** Position UUID (replaces `jobCode`) |
| `teamId` | INTEGER | Team assignment (nullable) |
| `newContractOid` | VARCHAR(20) | New contract OID (populated after processing) |
| `resumeFromStep` | VARCHAR(100) | Resume point for failed transfers (nullable) |

#### Signature Object

| Field | Type | Description |
|-------|------|-------------|
| `publicProfileId` | UUID | Profile public_id of signer |
| `name` | STRING | Signer full name |
| `email` | STRING | Signer email address |
| `jobTitle` | STRING | Job title (for employees only) |
| `role` | ENUM | Signer role: `"ADMIN"` or `"EMPLOYEE"` |
| `agreementType` | ENUM | Agreement type (see enum values below) |
| `status` | STRING | Signature status: `"AWAITING_SIGNATURE"` or `"SIGNED"` |
| `signedAt` | TIMESTAMP | Signature timestamp (nullable) |

#### Agreement Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Agreement document identifier |
| `pdfUrl` | TEXT | URL to PDF document |
| `type` | STRING | Agreement type: `"PREVIEW"` or `"PERMANENT"` |
| `expiresAt` | TIMESTAMP | Expiration timestamp (nullable, for preview agreements) |

### Enum Values

#### Transfer Status
- `DRAFT` - Initial state, transfer not yet submitted
- `PENDING_SIGNATURES` - Waiting for required signatures
- `SCHEDULED` - Approved and scheduled for processing
- `PROCESSING` - Currently being executed
- `COMPLETED` - Successfully finished
- `PARTIAL_FAILURE` - Some items failed, others succeeded
- `FAILED` - Transfer failed completely
- `CANCELLED` - Transfer was cancelled

#### Transfer Item Status
- `PENDING` - Initial state, waiting to be processed
- `PROCESSING` - Currently being executed
- `WAITING_FOR_RESOURCES` - Paused, waiting for external resources (e.g., underwriting approval)
- `COMPLETED` - Successfully finished
- `FAILED` - Item failed during processing

#### Signature Role
- `ADMIN` - Admin/requester signature
- `EMPLOYEE` - Employee signature

#### Agreement Types
- `ENTITY_ASSIGNMENT_AGREEMENT` - Entity assignment agreement
- `ARBITRATION_AGREEMENT` - Arbitration agreement document
- `WSE_NOTICE_OF_PEO_RELATIONSHIP` - WSE notice document

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": [
    {
      "field": "newPositionPublicId",
      "message": "Position with UUID not found"
    }
  ]
}
```

### 404 Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "Legal entity not found",
  "details": {
    "entityId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### 409 Conflict

```json
{
  "error": "CONFLICT",
  "message": "Contract already has pending transfer",
  "details": {
    "contractOid": "EMP12345",
    "existingTransferId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Example Use Cases

### 1. Transfer Single Employee with Position in Underwriting

```json
{
  "sourceLegalEntityPublicId": "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10",
  "destinationLegalEntityPublicId": "6569739c-33d5-4897-82f5-5284d2b17e71",
  "effectiveDate": "2025-02-01",
  "contracts": [
    {
      "peoContractOid": "EMP12345",
      "newBenefitGroupId": "400",
      "newPayGroupId": "cmj1mkiml01to01cngrnz3z1h",
      "newPtoPolicyId": "7422d56a-a372-46c5-adbd-9463d16d58cb",
      "newWorkLocationId": "1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6",
      "newPositionPublicId": "f6355dbb-861d-45e2-9c55-b206ad4c7647"
    }
  ]
}
```

**Note:** Even if the position doesn't have a Prism code yet (underwriting in progress), the transfer can be created. Processing will wait for underwriting approval.

### 2. Bulk Transfer with Multiple Employees

```json
{
  "sourceLegalEntityPublicId": "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10",
  "destinationLegalEntityPublicId": "6569739c-33d5-4897-82f5-5284d2b17e71",
  "effectiveDate": "2025-02-01",
  "contracts": [
    {
      "peoContractOid": "EMP12345",
      "newBenefitGroupId": "400",
      "newPayGroupId": "cmj1mkiml01to01cngrnz3z1h",
      "newPtoPolicyId": "7422d56a-a372-46c5-adbd-9463d16d58cb",
      "newWorkLocationId": "1eb08af5-4ce9-4fb1-8ddd-ab8ae5bb23c6",
      "newPositionPublicId": "f6355dbb-861d-45e2-9c55-b206ad4c7647",
      "newTeamId": 205923
    },
    {
      "peoContractOid": "EMP67890",
      "newBenefitGroupId": "600",
      "newPayGroupId": "cmj1mkiml01to01cngrnz3z2i",
      "newPtoPolicyId": "8533e67b-b483-57d6-bcde-a574e27d67cd",
      "newWorkLocationId": "2fc19bg6-5df0-5gc2-9eee-bc9bf6cc34d7",
      "newPositionPublicId": "g7466ecc-972e-56f3-0c66-c317be5c8758"
    }
  ],
  "additionalSignerProfilePublicIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

---

## Migration Guide

### For API Consumers

**Before (Old API):**
```json
{
  "contracts": [
    {
      "newJobCode": "MGR001"
    }
  ]
}
```

**After (New API):**
```json
{
  "contracts": [
    {
      "newPositionPublicId": "f6355dbb-861d-45e2-9c55-b206ad4c7647"
    }
  ]
}
```

**How to migrate:**
1. Call `GET /transfer_resources` to get available positions
2. Frontend receives: `{id: "f6355dbb-...", label: "Sales Development Manager"}`
3. Send the position `id` (UUID) as `newPositionPublicId`
4. Backend resolves UUID → Prism code at processing time

---

## References

- [Entity Transfer Data Structure](./entity-transfer-data-structure.md)
- [PEOCM-660 README](.ai/tasks/done/PEOCM-660/README.md) - Entity Transfer Tables Implementation
- [PEOCM-823 README](.ai/tasks/in_progress/PEOCM-823/README.md) - Position Public ID Migration
- [Entity Transfers Documentation](.ai/docs/backend/entity_transfers/README.md)
