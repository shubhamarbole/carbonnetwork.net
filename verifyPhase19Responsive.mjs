// verifyPhase19Responsive.mjs
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('PHASE 19 — MOBILE & RESPONSIVE ENTERPRISE VERIFICATION');
  console.log('====================================================\n');

  // Test Group 1: Sidebar Responsive Drawer Architecture
  console.log('--- Test Group 1: Sidebar Drawer Architecture (Sidebar.jsx) ---');
  const sidebarPath = path.resolve('frontend/src/components/Sidebar.jsx');
  assert(fs.existsSync(sidebarPath), 'Sidebar.jsx exists');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

  assert(sidebarContent.includes('isOpen = false') && sidebarContent.includes('onClose'), 'Sidebar accepts isOpen and onClose props');
  assert(sidebarContent.includes('backdrop-blur') && sidebarContent.includes('lg:hidden'), 'Sidebar renders backdrop overlay on mobile only');
  assert(sidebarContent.includes('-translate-x-full') && sidebarContent.includes('lg:translate-x-0'), 'Sidebar uses responsive transform offscreen on mobile and persistent on lg+');
  assert(sidebarContent.includes('aria-label="Close navigation menu"'), 'Sidebar includes accessible mobile drawer close button');
  assert(sidebarContent.includes('onClose?.()'), 'Sidebar nav links automatically close drawer on selection');

  // Test Group 2: App Layout & Mobile Sticky Top Header
  console.log('\n--- Test Group 2: Layout & Mobile Header Architecture (App.jsx) ---');
  const appPath = path.resolve('frontend/src/App.jsx');
  assert(fs.existsSync(appPath), 'App.jsx exists');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert(appContent.includes('const [mobileMenuOpen, setMobileMenuOpen] = useState(false)'), 'Layout manages mobileMenuOpen state');
  assert(appContent.includes('setMobileMenuOpen(false)'), 'Layout automatically closes mobile drawer on route changes');
  assert(appContent.includes('aria-label="Open navigation menu"'), 'Layout has accessible mobile hamburger button');
  assert(appContent.includes('min-w-[44px] min-h-[44px]'), 'Mobile hamburger button meets touch target accessibility (>= 44px)');
  assert(appContent.includes('lg:hidden sticky top-0'), 'Mobile header is sticky top and hidden on desktop (lg:hidden)');
  assert(appContent.includes('w-full lg:ml-[275px] lg:w-[calc(100%-275px)] min-w-0'), 'Content container uses full width on mobile and 275px offset on desktop without clipping');

  // Test Group 3: Risk Registry Responsive Transformations
  console.log('\n--- Test Group 3: Risk Registry Responsive Transformations (RiskList.jsx) ---');
  const riskListPath = path.resolve('frontend/src/pages/risk/RiskList.jsx');
  assert(fs.existsSync(riskListPath), 'RiskList.jsx exists');
  const riskListContent = fs.readFileSync(riskListPath, 'utf8');

  assert(riskListContent.includes('hidden md:block overflow-x-auto'), 'Risk table is wrapped in hidden md:block for desktop/tablet');
  assert(riskListContent.includes('md:hidden divide-y divide-slate-100'), 'Risk list renders responsive card view on mobile (<md)');
  assert(riskListContent.includes('min-h-[40px]'), 'Risk card actions meet mobile touch target requirements (>= 40px)');
  assert(riskListContent.includes('flex flex-col sm:flex-row'), 'Search and pagination adapt gracefully across viewport widths');

  // Test Group 4: Predictive Risk Intelligence Responsive Views
  console.log('\n--- Test Group 4: Predictive Risk Dashboard Responsive Views (PredictiveRiskDashboard.jsx) ---');
  const predPath = path.resolve('frontend/src/pages/risk/PredictiveRiskDashboard.jsx');
  assert(fs.existsSync(predPath), 'PredictiveRiskDashboard.jsx exists');
  const predContent = fs.readFileSync(predPath, 'utf8');

  assert(predContent.includes('hidden md:block overflow-x-auto'), 'Predictive risks table is hidden on small mobile screens (hidden md:block)');
  assert(predContent.includes('md:hidden divide-y divide-slate-100'), 'Emerging risks render responsive card view on mobile');
  assert(predContent.includes('min-h-[40px]'), 'Predictive mobile actions provide >= 40px touch targets');

  // Test Group 5: Alert Center & Command Center Responsive Touch Actions
  console.log('\n--- Test Group 5: Alert Center & Command Center Touch Targets ---');
  const alertPath = path.resolve('frontend/src/pages/risk/AlertCenter.jsx');
  const alertContent = fs.readFileSync(alertPath, 'utf8');
  assert(alertContent.includes('min-h-[40px]'), 'AlertCenter action buttons provide accessible touch targets (min-h-[40px])');

  const ccPath = path.resolve('frontend/src/pages/risk/CommandCenter.jsx');
  const ccContent = fs.readFileSync(ccPath, 'utf8');
  assert(ccContent.includes('min-h-[40px]'), 'CommandCenter search and buttons provide accessible touch targets (min-h-[40px])');

  // Test Group 6: Live Service Endpoints & Health Check
  console.log('\n--- Test Group 6: Live Services Connectivity (Ports 3030, 5050, 8000) ---');
  try {
    const viteRes = await fetch('http://localhost:3030/');
    assert(viteRes.ok && viteRes.status === 200, 'Vite frontend running on port 3030 returns HTTP 200');
  } catch (e) {
    assert(false, `Vite frontend port 3030 reachable: ${e.message}`);
  }

  try {
    const expressRes = await fetch('http://localhost:5050/api/health');
    const expressJson = await expressRes.json();
    assert(expressRes.ok && expressJson.status === 'healthy', `Express backend on port 5050 reports status healthy (v${expressJson.version})`);
  } catch (e) {
    assert(false, `Express backend port 5050 reachable: ${e.message}`);
  }

  try {
    const pythonRes = await fetch('http://localhost:8000/health');
    const pythonJson = await pythonRes.json();
    assert(pythonRes.ok && pythonJson.status === 'healthy', 'Python FastAPI on port 8000 reports healthy');
  } catch (e) {
    assert(false, `Python FastAPI port 8000 reachable: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
