/**
 * Vector Store Resilience & Deletion Consistency Verification
 * Hardening Section 19:
 * Verify:
 * Document ingested -> metadata stored -> vector searchable
 * -> Document deleted -> metadata removed -> vector removed -> retrieval test confirms absence.
 */

import fs from 'fs';

const EXPRESS_URL = 'http://localhost:5050';
const PYTHON_URL = 'http://localhost:8000';

async function login(email, password = 'password123') {
  const res = await fetch(`${EXPRESS_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${json.message}`);
  return { token: json.data.token, user: json.data.user };
}

async function runVectorConsistencyTest() {
  console.log('================================================================');
  console.log('⚡ SECTION 19: VECTOR STORE RESILIENCE & DELETION CONSISTENCY');
  console.log('================================================================');

  const { token, user } = await login('esg_mgr@acme.com');
  const orgId = user.organizationId || 'org-acme-1';

  const uniqueKeyword = `BIOCHAR_OFFSET_${Date.now()}`;
  const docId = `doc_cons_${Date.now()}`;
  const sampleText = `This policy standard outlines certified standards for ${uniqueKeyword}. Strict verification protocols must be observed under international greenhouse gas protocols.`;

  // Step 1: Ingest document into vector store
  console.log('\n--- Step 1: Direct Ingestion with Chunking & Embeddings ---');
  if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });
  const filePath = `./uploads/policy_${uniqueKeyword}.txt`;
  fs.writeFileSync(filePath, sampleText);

  const ingestPayload = {
    document_id: docId,
    filename: `policy_${uniqueKeyword}.txt`,
    file_path: filePath,
    mime_type: 'text/plain',
    organization_id: orgId,
    project_id: 'proj_cons_1',
    category: 'Carbon'
  };

  const ingestRes = await fetch(`${PYTHON_URL}/internal/knowledge/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': 'esg-ai-internal-service-key-secret-2026'
    },
    body: JSON.stringify(ingestPayload)
  });

  const ingestData = await ingestRes.json();
  console.log(`Ingest response status: ${ingestRes.status}, chunk_count: ${ingestData.chunk_count}`);
  if (!ingestData.success || ingestData.chunk_count === 0) {
    throw new Error(`Document ingestion failed: ${JSON.stringify(ingestData)}`);
  }
  console.log(`[OK] Document ${docId} indexed in vector DB with ${ingestData.chunk_count} chunks.`);

  // Step 2: Semantic retrieval test confirming presence
  console.log('\n--- Step 2: Semantic Retrieval Test (Confirming Presence) ---');
  const searchRes = await fetch(`${PYTHON_URL}/internal/knowledge/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': 'esg-ai-internal-service-key-secret-2026'
    },
    body: JSON.stringify({
      query_text: uniqueKeyword,
      organization_id: orgId,
      top_k: 5,
      min_score: 0.0
    })
  });

  const searchData = await searchRes.json();
  const chunkList = Array.isArray(searchData) ? searchData : (searchData.chunks || []);
  const foundBefore = chunkList.filter(c => c.document_id === docId || c.text.includes(uniqueKeyword));
  console.log(`Search returned ${chunkList.length} chunks, matching doc chunks: ${foundBefore.length}`);
  if (foundBefore.length === 0) {
    throw new Error('Vector retrieval failed to locate freshly ingested chunk!');
  }
  console.log(`[OK] Semantic retrieval successfully located chunk (relevance score: ${foundBefore[0].score})`);

  // Step 3: Delete document vectors
  console.log('\n--- Step 3: Deleting Document Vectors ---');
  const deleteRes = await fetch(`${PYTHON_URL}/internal/knowledge/documents/${docId}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Service-Key': 'esg-ai-internal-service-key-secret-2026'
    }
  });
  const deleteData = await deleteRes.json();
  console.log(`Deletion response status: ${deleteRes.status}, deleted_points: ${deleteData.deleted_points}`);
  if (!deleteData.success) {
    throw new Error(`Vector deletion API failed: ${JSON.stringify(deleteData)}`);
  }
  console.log(`[OK] Vector points deleted: ${deleteData.deleted_points}`);

  // Step 4: Semantic retrieval test confirming absence
  console.log('\n--- Step 4: Semantic Retrieval Test (Confirming Absence) ---');
  const postSearchRes = await fetch(`${PYTHON_URL}/internal/knowledge/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': 'esg-ai-internal-service-key-secret-2026'
    },
    body: JSON.stringify({
      query_text: uniqueKeyword,
      organization_id: orgId,
      top_k: 5,
      min_score: 0.0
    })
  });

  const postSearchData = await postSearchRes.json();
  const postChunkList = Array.isArray(postSearchData) ? postSearchData : (postSearchData.chunks || []);
  const foundAfter = postChunkList.filter(c => c.document_id === docId || c.text.includes(uniqueKeyword));
  console.log(`Post-deletion search returned ${postChunkList.length} chunks, matching deleted doc: ${foundAfter.length}`);
  if (foundAfter.length !== 0) {
    throw new Error(`Deletion consistency violated: ${foundAfter.length} vectors still present after deletion!`);
  }
  console.log('[OK] Deletion consistency VERIFIED: 0 matching vectors found after deletion.');

  // Cleanup temp file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log('\n================================================================');
  console.log('🎉 SECTION 19 VECTOR STORE RESILIENCE & CONSISTENCY VERIFIED!');
  console.log('================================================================');
}

runVectorConsistencyTest().catch(err => {
  console.error('\n❌ VECTOR CONSISTENCY VERIFICATION FAILED:', err);
  process.exit(1);
});
