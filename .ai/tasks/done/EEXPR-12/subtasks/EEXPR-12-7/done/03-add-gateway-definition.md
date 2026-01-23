<!--
╔══════════════════════════════════════════════════════════════════╗
║ WORK ITEM: 03-add-gateway-definition.md                          ║
║ TASK: EEXPR-12-7                                                 ║
╠══════════════════════════════════════════════════════════════════╣
║ GIT CONTEXT:                                                     ║
║   Repo: backend                                                  ║
║   Path: /Users/gabriel.herter/Documents/Projects/deel/backend    ║
║   Branch: EEXPR-12-7-unified-entity-transfers                    ║
║                                                                  ║
║ BEFORE GIT OPERATIONS:                                           ║
║   cd /Users/gabriel.herter/Documents/Projects/deel/backend       ║
║   git rev-parse --show-toplevel                                  ║
╠══════════════════════════════════════════════════════════════════╣
║ WORKFLOW:                                                        ║
║ 1. Move this file to in_progress/ when starting                  ║
║ 2. Update status.yaml with new status                            ║
║ 3. Complete ALL steps below                                      ║
║ 4. Move to done/ when complete, update status.yaml               ║
║ 5. Update task README with any learnings                         ║
╚══════════════════════════════════════════════════════════════════╝
-->

---
repo: "backend"
repo_path: "/Users/gabriel.herter/Documents/Projects/deel/backend"
branch: "EEXPR-12-7-unified-entity-transfers"
protected: false
---

# Add Gateway Definition

## Objective

Add OpenAPI/Swagger gateway definition for the unified entity transfers endpoint to document the API and enable proper gateway routing.

## Pre-Implementation

Before starting, explore existing gateway definitions:
- Look in `backend/gateway/` or `backend/api/definitions/` for OpenAPI specs
- Understand how other tech_ops endpoints are defined
- Check if there's a centralized swagger/openapi configuration

## Implementation Steps

### Step 1: Find Gateway Definition Location

Search for existing entity transfer or tech_ops gateway definitions:

```bash
find backend -name "*.yaml" -o -name "*.json" | xargs grep -l "entity_transfer\|tech_ops"
```

Or look for OpenAPI/Swagger configuration files.

### Step 2: Add Gateway Definition

**Add the following definition** to the appropriate location (adjust format based on existing patterns):

**OpenAPI 3.0 YAML format**:

```yaml
/admin/peo/tech_ops/entity_transfer/unified:
  get:
    summary: Get unified entity transfers (EOR + PEO)
    description: |
      Aggregates entity transfer listings from both EOR and PEO services.
      Returns separate arrays for each service type with optional status filtering.
    operationId: getUnifiedEntityTransfers
    tags:
      - PEO Tech Ops
      - Entity Transfers
    security:
      - bearerAuth: []
    parameters:
      - name: types
        in: query
        description: Comma-separated types to fetch (eor, peo)
        required: false
        schema:
          type: string
          default: "eor,peo"
          example: "eor,peo"
      - name: sourceLegalEntityPublicId
        in: query
        description: Source legal entity UUID (required when types includes 'peo')
        required: false
        schema:
          type: string
          format: uuid
          example: "13c44a93-cf52-4dd3-a1ba-cf8e8404cd10"
      - name: organizationId
        in: query
        description: Organization ID (required when types includes 'eor')
        required: false
        schema:
          type: integer
          example: 106252
      - name: eorStatus
        in: query
        description: Comma-separated EOR status filter (AWAITING_SIGNATURE, IN_PROGRESS, COMPLETED)
        required: false
        schema:
          type: string
          example: "AWAITING_SIGNATURE,COMPLETED"
      - name: peoStatus
        in: query
        description: Comma-separated PEO status filter (DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, FAILED, CANCELLED)
        required: false
        schema:
          type: string
          example: "DRAFT,SCHEDULED"
    responses:
      '200':
        description: Unified entity transfers response
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    eor:
                      type: array
                      nullable: true
                      description: EOR entity movements (null if not requested or error)
                      items:
                        $ref: '#/components/schemas/EOREntityMovement'
                    peo:
                      type: object
                      nullable: true
                      description: PEO entity transfers (null if not requested or error)
                      properties:
                        transfers:
                          type: array
                          items:
                            $ref: '#/components/schemas/PEOEntityTransfer'
                        cursor:
                          type: string
                          nullable: true
                        hasMore:
                          type: boolean
                    errors:
                      type: object
                      description: Present only if one or more services failed
                      properties:
                        eor:
                          type: string
                        peo:
                          type: string
      '400':
        description: Validation error
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: false
                message:
                  type: string
                  example: "sourceLegalEntityPublicId is required when types includes peo"
      '401':
        description: Unauthorized
      '500':
        description: Internal server error
```

### Step 3: Add Schema Components (if needed)

If the schemas don't already exist, add them:

```yaml
components:
  schemas:
    EOREntityMovement:
      type: object
      properties:
        id:
          type: string
          format: uuid
        requesterProfileId:
          type: integer
        status:
          type: string
          enum: [AWAITING_SIGNATURE, IN_PROGRESS, COMPLETED]
        completedAt:
          type: string
          format: date-time
          nullable: true
        destinationLegalEntity:
          type: object
          properties:
            id:
              type: integer
            publicId:
              type: string
              format: uuid
            name:
              type: string
        contracts:
          type: array
          items:
            type: object
            properties:
              oid:
                type: string
              employeeLegalName:
                type: string
                nullable: true
              jobTitle:
                type: string
                nullable: true
              originLegalEntity:
                type: object
                properties:
                  id:
                    type: integer
                  publicId:
                    type: string
                  name:
                    type: string
        signatures:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              profileId:
                type: integer
              publicProfileId:
                type: string
              name:
                type: string
              pictureUrl:
                type: string
                nullable: true
              role:
                type: string
                enum: [REQUESTER, ENTITY_POC]
              status:
                type: string
                enum: [AWAITING_SIGNATURE, SIGNED]
              signedAt:
                type: string
                format: date-time
                nullable: true

    PEOEntityTransfer:
      type: object
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum: [DRAFT, PENDING_SIGNATURES, SCHEDULED, PROCESSING, COMPLETED, PARTIAL_FAILURE, FAILED, CANCELLED]
        organizationId:
          type: integer
        requesterProfilePublicId:
          type: string
          format: uuid
        sourceLegalEntityPublicId:
          type: string
          format: uuid
        destinationLegalEntityPublicId:
          type: string
          format: uuid
        effectiveDate:
          type: string
          format: date
        items:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              status:
                type: string
              baseContractOid:
                type: string
              employeeName:
                type: string
        signatures:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              profilePublicId:
                type: string
              role:
                type: string
                enum: [ADMIN, EMPLOYEE]
              signedAt:
                type: string
                format: date-time
                nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
```

### Step 4: Verify Gateway Registration

Ensure the endpoint is properly registered in the gateway by:
1. Checking gateway configuration files
2. Verifying the route appears in swagger/openapi docs
3. Testing that the gateway routes requests correctly

## Post-Implementation

After completing, run a **code review agent** to check for issues.

## Acceptance Criteria

- [ ] Gateway definition added with all query parameters documented
- [ ] Response schema documented including partial failure case
- [ ] Error responses (400, 401, 500) documented
- [ ] Component schemas added for EOR and PEO response types
- [ ] Endpoint appears in API documentation

## Testing

1. Start the backend server
2. Navigate to Swagger/OpenAPI documentation
3. Verify the endpoint appears with all parameters
4. Test the "Try it out" functionality if available

## Notes

- The exact location and format depends on the existing gateway configuration
- Some backends use JSON instead of YAML for OpenAPI specs
- The gateway may auto-generate some of this from route definitions
