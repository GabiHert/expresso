/task-explore Get context on what is the task EEXPR-12 and what is the transfers_resources endpoint.

 We need to develop task EEXPR-13 which is about the entity transfers POST endpoint. This endpoint needs to receive a payload like the following:
{
  "organizationId": 191800,
  "requesterProfilePublicId": "4e905865-a3ec-42e3-809f-692df21ac157",
  "sourceLegalEntityPublicId": "c08b9e0a-b300-43a4-b0ea-909ce3137d14",
  "destinationLegalEntityPublicId": "e21174db-c58e-4a59-a8cc-0004a3c876e5",
  "contracts": [
    {
      "basePeoContractOid": "3j5g47p",
      "newBenefitGroupId": "4",
      "newTeamId": "375618", //optional
      "newPayrollSettingsId": "cmi82fl2b00cd01bk6waddhj8",
      "newPtoPolicyId": "5d147f3a-9600-4036-a303-2bd3c58ecd27",
      "newWorkLocationId": "b38548f7-8224-4f1c-8fcf-d438c4c73c0f",
      "newPositionPublicId": "268c7e36-7fc8-49b3-a214-c95646254937"
    }
  ]
"additionalSignerProfilePublicIds": ["uuid"]

}

and with that:


1. Execute the sanity check steps only: crossHireSanityCheck,terminationSanityCheck,sanityCheckResourcesExist
2. Create UW request for unexistent resources  
3. Create transfer with status PENDING_SIGNATURES (just like our tech_ops POST /entity_transfer endpoint)
4. Leave an empty function to implement in the future the Entity Assignment Agreement preview PDF (temporary, expires in 15 minutes) and Create worker document requirements for WSE and Arbitraiton agreement. This implementation is not scope of this task but we need to have this functino to implement it later

Returns both transfer data (JUst like the EEXPR-12 does. IN the future we will return here too the  agreement preview URL) 
example:

Status 201:
````json

 {
  "transfer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING_SIGNATURES",
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
    "pdfUrl": "https://s3.amazonaws.com/deel-documents/agreements/permanent-agreement-2025.pdf",
    "type": "PERMANENT",
    "createdAt": "2025-01-15T10:30:00Z",
    "expiresAt": null
  }
 }
```

Notes: 
1. A function that create the missing UW requests does not exists in the entity_trasnfers context yet. It is part of the scope of this task to create it:
We need this step to execute if resource doesn't exist → Extract code from source and create underwriting request. 
2. we have a executeTransfer method in entity_transfers_service that executes all steps. We need to create exectuteTransferSanityCheck to execute the sanyty check steps only
Before we proceed with the task.

IMPORTANT!
Mainly for the UW creation we need to be careful on how to create it. I believe we have some doc in the /ask structure that explains how the UW process goes. We need that to be matching this patterns so we can execute all UW related executeTransfer steps with success (event the force complete if needed)

At this point we need to have this task with very well defined scope and with no Gaps. So research, document and ask any questions you need.