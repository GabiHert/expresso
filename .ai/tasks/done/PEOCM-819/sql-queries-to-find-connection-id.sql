-- SQL Queries to Find Integration Connection ID for Organization 58362
-- 
-- Note: The integrations service may use a separate database.
-- Try these queries in order until one works.

-- Query 1: Check if there's a connections table in public schema
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name ILIKE '%connection%'
  OR table_name ILIKE '%integration%'
ORDER BY table_schema, table_name;

-- Query 2: If connections table exists in public schema
SELECT 
  id as connection_id,
  organization_id,
  plugin,
  plugin_key,
  provider,
  status,
  name
FROM public.connections
WHERE organization_id = 58362
  AND (plugin = 'hibob' OR plugin_key = 'hibob' OR provider = 'hibob')
ORDER BY created_at DESC;

-- Query 3: Check for integration-related tables
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name ILIKE '%hris%' OR table_name ILIKE '%integration%')
ORDER BY table_name;

-- Query 4: Check if there's a link between HRIS profiles and connections
-- (Adjust table/column names based on actual schema)
SELECT 
  hp.id as hris_profile_id,
  hp.oid as hris_profile_oid,
  hp.external_id as hris_integration_provider_id,
  -- Add connection_id field if it exists
  c.id as connection_id,
  c.organization_id
FROM public.hris_profiles hp
LEFT JOIN public.connections c ON c.id = hp.connection_id  -- Adjust join condition
WHERE hp.oid = '903421b5-9814-43d8-b9ab-2d48637a9d6e'
LIMIT 1;

-- Query 5: Check PEO contract HRIS integration data table
SELECT 
  hpid.peo_contract_id,
  hpid.hris_integration_provider_id,
  hpid.hris_integration_name,
  hpid.json_data->>'connectionId' as connection_id_from_json,
  hpid.json_data
FROM peo.peo_contract_hris_integration_data hpid
JOIN peo.peo_contracts pc ON pc.id = hpid.peo_contract_id
WHERE pc.deel_contract_id = 2577352
  AND hpid.hris_integration_name = 'hibob'
LIMIT 1;

-- Query 6: Check if there's an integrations schema
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'integrations'
ORDER BY table_name;

-- Query 7: If integrations schema exists, query connections there
SELECT 
  id as connection_id,
  organization_id,
  plugin,
  plugin_key,
  provider,
  status
FROM integrations.connections
WHERE organization_id = 58362
  AND (plugin = 'hibob' OR plugin_key = 'hibob')
ORDER BY created_at DESC;

-- Query 8: Check for organization integrations mapping table
SELECT 
  oi.organization_id,
  oi.integration_id as connection_id,
  oi.provider_type,
  oi.status
FROM public.organization_integrations oi
WHERE oi.organization_id = 58362
  AND oi.provider_type = 'hibob'
ORDER BY oi.created_at DESC;

