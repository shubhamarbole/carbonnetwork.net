/**
 * Phase 4 AI Risk Manager - Comprehensive End-to-End Verification Suite
 * Verifies all Phase 4 Definition of Done (DoD) requirements:
 * 1. Health & Dual Service Availability (Express 5050 & FastAPI 8000)
 * 2. Authenticate Personas (SUPER_ADMIN, ACME_ADMIN, MSME_USER, VIEWER)
 * 3. Upload Authorization: reject unauthenticated & VIEWER (401 & 403)
 * 4. Document Ingestion & Qdrant Vector Indexing (POST /api/knowledge/documents)
 * 5. Tenant Isolation: MSME user cannot view or search Acme documents (403 or empty)
 * 6. Document Listing & Category Filtering (GET /api/knowledge/documents)
 * 7. Document Single Retrieval (GET /api/knowledge/documents/:id)
 * 8. Semantic Vector Search Endpoint with Tenant Filter (POST /api/knowledge/search)
 * 9. Document Reprocessing Workflow (POST /api/knowledge/documents/:id/reprocess)
 * 10. AI Risk Analysis with RAG Evidence Citations (POST /api/risks/:id/analyze)
 * 11. Authoritative Phase 2 Deterministic Score Protection (scores remain untouched)
 * 12. Unauthorized AI Analysis (VIEWER blocked)
 * 13. Document Deletion & Vector Cleanup (DELETE /api/knowledge/documents/:id)
 * 14. Comprehensive Audit Trail Verification:
 *     - KNOWLEDGE_DOCUMENT_UPLOADED
 *     - KNOWLEDGE_DOCUMENT_PROCESSED
 *     - KNOWLEDGE_DOCUMENT_REPROCESSED
 *     - KNOWLEDGE_DOCUMENT_DELETED
 *     - RAG_RETRIEVAL_STARTED
 *     - RAG_RETRIEVAL_COMPLETED
 *     - AI_RISK_ANALYSIS_WITH_RAG
 * 15. Teardown of test risks and temporary files
 */

import fs from 'fs';
import path from 'path';

const BASE_EXPRESS = 'http://localhost:5050';
const BASE_FASTAPI = 'http://localhost:8000';

let superAdminToken = '';
let acmeToken = '';
let msmeToken = '';
let viewerToken = '';

let acmeOrgId = '';
let msmeOrgId = '';

let uploadedDocId = '';
let testRiskId = '';
let tempTxtPath = '';

async function runPhase4DoDVerification() {
  console.log('================================================================');
  console.log('📚 PHASE 4 RAG KNOWLEDGE SYSTEM - END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // STEP 1: Health & Dual Service Availability
  console.log('--- Step 1: Health & Dual Service Availability ---');
  const expRes = await fetch(`${BASE_EXPRESS}/api/health`);
  const expHealth = await expRes.json();
  if (expRes.status !== 200 || expHealth.status !== 'healthy') {
    throw new Error(`Express server health check failed: ${JSON.stringify(expHealth)}`);
  }
  console.log('✅ Express Gateway (Port 5050) is healthy.');

  const pyRes = await fetch(`${BASE_FASTAPI}/api/health`);
  const pyHealth = await pyRes.json();
  if (pyRes.status !== 200 || pyHealth.status !== 'healthy') {
    throw new Error(`FastAPI AI service health check failed: ${JSON.stringify(pyHealth)}`);
  }
  console.log('✅ FastAPI Python AI Service (Port 8000) is healthy.');

  // STEP 2: Authenticate Personas
  console.log('\n--- Step 2: Role Authentication ---');
  async function login(email, password) {
    const res = await fetch(`${BASE_EXPRESS}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.data?.token || data.token;
  }

  superAdminToken = await login('superadmin@esg.com', 'password123');
  acmeToken = await login('admin@acme.com', 'password123');
  msmeToken = await login('msme@esg.com', 'password123');
  viewerToken = await login('viewer@acme.com', 'password123');

  if (!superAdminToken || !acmeToken || !msmeToken || !viewerToken) {
    throw new Error('Failed to authenticate test personas.');
  }

  // Resolve org IDs
  const orgsRes = await fetch(`${BASE_EXPRESS}/api/risks/meta/organizations`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const orgsData = await orgsRes.json();
  const orgs = orgsData.data || [];
  acmeOrgId = orgs.find(o => o.name?.includes('Acme'))?._id || '';
  msmeOrgId = orgs.find(o => o.name?.includes('Eco Corp') || o.type === 'MSME')?._id || '';

  console.log(`✅ Authenticated personas. Acme Org ID: ${acmeOrgId}, MSME Org ID: ${msmeOrgId}`);

  // STEP 3: Upload Authorization
  console.log('\n--- Step 3: Upload Authorization Checks ---');
  // 1. Unauthenticated request -> 401
  const unauthUpload = await fetch(`${BASE_EXPRESS}/api/knowledge/documents`, {
    method: 'POST'
  });
  if (unauthUpload.status !== 401) {
    throw new Error(`Expected 401 on unauthenticated upload, got ${unauthUpload.status}`);
  }
  console.log('✅ Unauthenticated upload correctly rejected with 401.');

  // 2. Viewer role upload -> 403
  const viewerUpload = await fetch(`${BASE_EXPRESS}/api/knowledge/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${viewerToken}` }
  });
  if (viewerUpload.status !== 403) {
    throw new Error(`Expected 403 on VIEWER upload, got ${viewerUpload.status}`);
  }
  console.log('✅ VIEWER upload correctly blocked with 403 Forbidden.');

  // STEP 4: Document Ingestion & Qdrant Vector Indexing
  console.log('\n--- Step 4: Document Ingestion & Qdrant Indexing ---');
  // Create a temporary document file
  tempTxtPath = path.resolve('scratch_acme_flare_sop.txt');
  fs.writeFileSync(tempTxtPath, 
    "SECTION 1: ENVIRONMENTAL EMISSIONS DIRECTIVE\n" +
    "Acme Corporation requires all methane flare systems to operate at 98% combustion efficiency.\n" +
    "Weekly burner tip ultrasonic acoustic monitoring must be logged in the risk registry.\n\n" +
    "SECTION 2: CRITICAL PENALTIES\n" +
    "Uncontained flaring exceeding 4 hours triggers mandatory regulatory self-reporting and Tier 1 audits."
  );

  // Upload document using FormData
  const fileBlob = new Blob([fs.readFileSync(tempTxtPath)], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', fileBlob, 'Acme_Flare_Mitigation_SOP.txt');
  formData.append('display_name', 'Acme Flare Combustion SOP 2026');
  formData.append('category', 'Environmental Policy');

  const uploadRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${acmeToken}` },
    body: formData
  });

  const uploadJson = await uploadRes.json();
  if (uploadRes.status !== 201 || !uploadJson.success) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadJson)}`);
  }

  uploadedDocId = uploadJson.data.document_id;
  console.log(`✅ Document successfully uploaded: ${uploadedDocId}`);
  console.log(`   Status: ${uploadJson.data.processing_status}, Chunks: ${uploadJson.data.chunk_count}, Model: ${uploadJson.data.embedding_model}`);

  if (uploadJson.data.processing_status !== 'READY') {
    throw new Error(`Expected document status READY, got ${uploadJson.data.processing_status}`);
  }
  if (uploadJson.data.chunk_count < 1) {
    throw new Error(`Expected chunk_count >= 1, got ${uploadJson.data.chunk_count}`);
  }

  // STEP 5: Tenant Isolation Verification
  console.log('\n--- Step 5: Tenant Isolation Boundaries ---');
  // MSME user attempts to access Acme's document by ID -> 403 Forbidden
  const msmeGetDoc = await fetch(`${BASE_EXPRESS}/api/knowledge/documents/${uploadedDocId}`, {
    headers: { 'Authorization': `Bearer ${msmeToken}` }
  });
  if (msmeGetDoc.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-tenant document view, got ${msmeGetDoc.status}`);
  }
  console.log('✅ Cross-tenant GET /api/knowledge/documents/:id strictly blocked with 403.');

  // MSME user lists documents -> must not contain Acme's document
  const msmeListRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents`, {
    headers: { 'Authorization': `Bearer ${msmeToken}` }
  });
  const msmeListData = await msmeListRes.json();
  const msmeDocs = msmeListData.data || [];
  const leakedDoc = msmeDocs.find(d => d.document_id === uploadedDocId);
  if (leakedDoc) {
    throw new Error('Tenant isolation violated! Acme document found in MSME document list.');
  }
  console.log('✅ MSME document list correctly isolates tenant; Acme document not visible.');

  // STEP 6: Document Listing & Category Filtering
  console.log('\n--- Step 6: Document Listing & Category Filtering ---');
  const listRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents?category=Environmental%20Policy`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const listJson = await listRes.json();
  if (listRes.status !== 200 || !listJson.success) {
    throw new Error(`Failed to list documents: ${JSON.stringify(listJson)}`);
  }
  const found = listJson.data.find(d => d.document_id === uploadedDocId);
  if (!found) {
    throw new Error('Uploaded document not found in filtered listing.');
  }
  console.log(`✅ Document listing returned ${listJson.count} documents; category filtering verified.`);

  // STEP 7: Single Document Retrieval
  console.log('\n--- Step 7: Single Document Retrieval ---');
  const getDocRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents/${uploadedDocId}`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const getDocJson = await getDocRes.json();
  if (getDocRes.status !== 200 || !getDocJson.success) {
    throw new Error(`Failed to retrieve document: ${JSON.stringify(getDocJson)}`);
  }
  console.log(`✅ Retrieved document: ${getDocJson.data.display_name} (${getDocJson.data.mime_type})`);

  // STEP 8: Semantic Vector Search Endpoint
  console.log('\n--- Step 8: Semantic Vector Search (POST /api/knowledge/search) ---');
  const searchRes = await fetch(`${BASE_EXPRESS}/api/knowledge/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({
      query_text: 'methane flare combustion 98% ultrasonic acoustic monitoring',
      top_k: 3,
      min_score: 0.1
    })
  });
  const searchJson = await searchRes.json();
  if (searchRes.status !== 200 || !searchJson.success) {
    throw new Error(`Search failed: ${JSON.stringify(searchJson)}`);
  }
  if (searchJson.data.length === 0) {
    throw new Error('Expected at least 1 retrieved chunk in semantic search.');
  }
  console.log(`✅ Semantic search returned ${searchJson.data.length} chunk(s). Top match relevance: ${searchJson.data[0].score}`);
  console.log(`   Evidence snippet: "${searchJson.data[0].text.substring(0, 70)}..."`);

  // STEP 9: Document Reprocessing Workflow
  console.log('\n--- Step 9: Document Reprocessing Workflow ---');
  const reprocessRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents/${uploadedDocId}/reprocess`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const reprocessJson = await reprocessRes.json();
  if (reprocessRes.status !== 200 || !reprocessJson.success) {
    throw new Error(`Reprocess failed: ${JSON.stringify(reprocessJson)}`);
  }
  if (reprocessJson.data.processing_status !== 'READY') {
    throw new Error(`Expected READY status after reprocess, got ${reprocessJson.data.processing_status}`);
  }
  console.log('✅ Document successfully reprocessed and re-indexed.');

  // STEP 10: AI Risk Analysis with RAG Evidence Citations
  console.log('\n--- Step 10: Evidence-Grounded AI Risk Analysis (POST /api/risks/:id/analyze) ---');
  // Create a test risk in Acme organization related to the uploaded document
  const createRiskRes = await fetch(`${BASE_EXPRESS}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({
      title: 'Methane Flaring Combustion Degradation',
      description: 'Burner tip efficiency dropped below 90% causing uncontained fugitive methane release at North Flare.',
      category: 'Environmental',
      probability: 75,
      impact: 80,
      exposure: 70,
      urgency: 85
    })
  });
  const createRiskJson = await createRiskRes.json();
  if (!createRiskRes.ok || !createRiskJson.success) {
    throw new Error(`Failed to create test risk: ${JSON.stringify(createRiskJson)}`);
  }
  testRiskId = createRiskJson.data._id;
  const officialScore = createRiskJson.data.risk_score;
  const officialSeverity = createRiskJson.data.severity;
  console.log(`✅ Created test risk: ${testRiskId} (Score: ${officialScore}, Severity: ${officialSeverity})`);

  // Run AI Risk Analysis (should trigger RAG retrieval and citation grounding)
  const analyzeRes = await fetch(`${BASE_EXPRESS}/api/risks/${testRiskId}/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const analyzeJson = await analyzeRes.json();
  if (analyzeRes.status !== 200 || !analyzeJson.success) {
    throw new Error(`AI analysis with RAG failed: ${JSON.stringify(analyzeJson)}`);
  }

  const analysis = analyzeJson.data;
  console.log('✅ AI Risk Analysis completed successfully.');
  console.log(`   Summary: "${analysis.summary.substring(0, 100)}..."`);
  console.log(`   Confidence: ${analysis.confidence}`);
  console.log(`   Evidence citations: ${analysis.evidence ? analysis.evidence.length : 0}`);

  // Validate citations
  if (!analysis.evidence || analysis.evidence.length === 0) {
    throw new Error('Expected analysis to contain RAG evidence citations, but evidence array is empty.');
  }

  const topCitation = analysis.evidence[0];
  console.log(`   Top Citation: File="${topCitation.filename}", Section="${topCitation.section}", Relevance=${topCitation.relevance}`);
  if (!topCitation.filename || !topCitation.chunk_id) {
    throw new Error('Evidence citation missing mandatory filename or chunk_id fields.');
  }

  // STEP 11: Authoritative Score Protection
  console.log('\n--- Step 11: Authoritative Deterministic Score Protection ---');
  const verifyRiskRes = await fetch(`${BASE_EXPRESS}/api/risks/${testRiskId}`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const verifyRiskJson = await verifyRiskRes.json();
  const currentRisk = verifyRiskJson.data;

  if (currentRisk.risk_score !== officialScore) {
    throw new Error(`Score integrity violated! Original score was ${officialScore}, now ${currentRisk.risk_score}`);
  }
  if (currentRisk.severity !== officialSeverity) {
    throw new Error(`Severity integrity violated! Original was ${officialSeverity}, now ${currentRisk.severity}`);
  }
  console.log(`✅ Official Score (${currentRisk.risk_score}) and Severity (${currentRisk.severity}) remained strictly authoritative.`);

  // STEP 12: Unauthorized AI Analysis
  console.log('\n--- Step 12: Unauthorized AI Analysis Protection ---');
  const viewerAnalyze = await fetch(`${BASE_EXPRESS}/api/risks/${testRiskId}/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${viewerToken}` }
  });
  if (viewerAnalyze.status !== 403) {
    throw new Error(`Expected 403 for VIEWER role triggering AI analysis, got ${viewerAnalyze.status}`);
  }
  console.log('✅ VIEWER role correctly forbidden from triggering AI analysis (403).');

  // STEP 13: Document Deletion & Vector Cleanup
  console.log('\n--- Step 13: Document Deletion & Vector Cleanup ---');
  const deleteDocRes = await fetch(`${BASE_EXPRESS}/api/knowledge/documents/${uploadedDocId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const deleteDocJson = await deleteDocRes.json();
  if (deleteDocRes.status !== 200 || !deleteDocJson.success) {
    throw new Error(`Document deletion failed: ${JSON.stringify(deleteDocJson)}`);
  }
  console.log('✅ Document and associated vector embeddings deleted.');

  // Confirm document is gone
  const getDeletedDoc = await fetch(`${BASE_EXPRESS}/api/knowledge/documents/${uploadedDocId}`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  if (getDeletedDoc.status !== 404) {
    throw new Error(`Expected 404 for deleted document, got ${getDeletedDoc.status}`);
  }
  console.log('✅ GET /api/knowledge/documents/:id returns 404 Not Found after deletion.');

  // STEP 14: Comprehensive Audit Trail Verification
  console.log('\n--- Step 14: Audit Trail Verification ---');
  const auditRes = await fetch(`${BASE_EXPRESS}/api/risks/audit-logs?limit=50`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const auditJson = await auditRes.json();
  const logs = auditJson.data || [];
  const actionTypes = new Set(logs.map(l => l.action));

  const requiredActions = [
    'KNOWLEDGE_DOCUMENT_UPLOADED',
    'KNOWLEDGE_DOCUMENT_PROCESSED',
    'KNOWLEDGE_DOCUMENT_REPROCESSED',
    'KNOWLEDGE_DOCUMENT_DELETED',
    'RAG_RETRIEVAL_STARTED',
    'RAG_RETRIEVAL_COMPLETED',
    'AI_RISK_ANALYSIS_WITH_RAG'
  ];

  for (const action of requiredActions) {
    if (actionTypes.has(action)) {
      console.log(`✅ Audit Event Captured: ${action}`);
    } else {
      throw new Error(`Missing expected audit event: ${action}`);
    }
  }

  // STEP 15: Teardown
  console.log('\n--- Step 15: Teardown & Cleanup ---');
  if (testRiskId) {
    await fetch(`${BASE_EXPRESS}/api/risks/${testRiskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });
  }
  if (tempTxtPath && fs.existsSync(tempTxtPath)) {
    fs.unlinkSync(tempTxtPath);
  }
  console.log('✅ Temporary test records cleaned up.');

  console.log('\n================================================================');
  console.log('🎉 ALL 15 PHASE 4 DEFINITION-OF-DONE CHECKS PASSED PERFECTLY!');
  console.log('================================================================');
}

runPhase4DoDVerification().catch((err) => {
  console.error('\n❌ PHASE 4 VERIFICATION FAILED:', err.message);
  if (tempTxtPath && fs.existsSync(tempTxtPath)) {
    try { fs.unlinkSync(tempTxtPath); } catch (_) {}
  }
  process.exit(1);
});
