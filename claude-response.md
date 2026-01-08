1. ✅ countryId field: Use address.countryId from JSONB

- We need the country code (US, BR...). So I need you to explore both the code and the sql mcp in order to understand where should we get it from

2. ✅ expiresAt: Return null (not in current schema)

- Yes. The expiresAt will only be used by the POST entity_trasnfers endpoint (not yet implemented). This endpoint creates preview agreements. The GET endpoint will only deal with permanent agreements

3. ✅ Response format: Wrapped with success/data/count

- yes

4. ⚠️ Signature enrichment: Join with Profile model for name/email/jobTitle

- I need you to explore both the code and the sql mcp in order to understand where should we get it from

5. ⚠️ Item enrichment: Join with PeoContract + Profile for employee name/email

- I need you to explore both the code and the sql mcp in order to understand where should we get it from

6. ⚠️ Authorization: Filter by organization access

- I will set this up later. Lets remove it from current scope

7. ✅ Pagination: Keep 100 max limit

- C) Add cursor-based pagination for better performance

8. ✅ Position field: Use positionPublicId (confirm PEOCM-823 complete)

- It is completed. It is in dev branch right now.

9. ✅ Agreement FK: Use public_id not id

- yes
