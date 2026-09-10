import { 
  LayoutDashboard, Globe, Zap, Droplet, Recycle, Factory, Leaf, 
  Target, Bell, Paperclip, BarChart3, FileSpreadsheet, Bot, ClipboardList, ShieldCheck, HelpCircle,
  Building, Users, Cpu, Settings, Radio, FolderKanban, Award, Trash2, Archive, ShieldAlert, AlertTriangle, BookOpen, Activity, Server,
  TrendingUp, Gauge, Sliders, Scale, Code2, Search, CheckSquare, Eye, Briefcase, DollarSign, Database, FileText, CheckCircle2,
  Clock, RefreshCw, Plus
} from 'lucide-react';

export const workspacesList = [
  { role: 'SUPER_ADMIN', name: 'Super Admin Workspace', path: '/super-admin', icon: ShieldAlert, badge: 'Governance' },
  { role: 'PLATFORM_ADMIN', name: 'Platform Admin Workspace', path: '/platform-admin', icon: Activity, badge: 'Operations' },
  { role: 'MSME', name: 'MSME Workspace', path: '/msme', icon: Building, badge: 'Producer' },
  { role: 'ENTERPRISE', name: 'Enterprise Workspace', path: '/enterprise', icon: Factory, badge: 'Corporate' },
  { role: 'INVESTOR', name: 'Investor Workspace', path: '/investor', icon: TrendingUp, badge: 'Capital' },
  { role: 'CREDIT_BUYER', name: 'Credit Buyer Workspace', path: '/credit-buyer', icon: Award, badge: 'Market' },
  { role: 'VERIFIER', name: 'Verifier Workspace', path: '/verifier', icon: CheckCircle2, badge: 'MRV' },
  { role: 'AUDITOR', name: 'Auditor Workspace', path: '/auditor', icon: Scale, badge: 'Assurance' },
  { role: 'REGULATOR', name: 'Regulator Workspace', path: '/regulator', icon: ShieldCheck, badge: 'Compliance' },
  { role: 'REGISTRY', name: 'Registry Workspace', path: '/registry', icon: Database, badge: 'Ledger' },
  { role: 'ADVISOR', name: 'Advisor Workspace', path: '/advisor', icon: Briefcase, badge: 'Consulting' },
  { role: 'ASSOCIATION', name: 'Association Workspace', path: '/association', icon: Users, badge: 'Industry' },
  { role: 'TECHNOLOGY_PROVIDER', name: 'Technology Provider', path: '/technology-provider', icon: Radio, badge: 'IoT / Hardware' },
  { role: 'INSURER', name: 'Insurer Workspace', path: '/insurer', icon: AlertTriangle, badge: 'Underwriting' },
  { role: 'RESEARCHER', name: 'Research Workspace', path: '/researcher', icon: BookOpen, badge: 'Analytics' }
];

export const roleNavigationMap = {
  SUPER_ADMIN: [
    { name: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
    { name: 'Users & Roles', path: '/super-admin?tab=users', icon: Users },
    { name: 'Organizations', path: '/super-admin?tab=organizations', icon: Building },
    { name: 'AI Risk Manager', path: '/super-admin?tab=risk', icon: Bot },
    { name: 'Audit Logs', path: '/super-admin?tab=logs', icon: ClipboardList },
    { name: 'System Settings', path: '/super-admin?tab=settings', icon: Settings }
  ],
  PLATFORM_ADMIN: [
    { name: 'Dashboard', path: '/platform-admin', icon: Activity },
    { name: 'Organizations', path: '/platform-admin?tab=organizations', icon: Building },
    { name: 'Submissions', path: '/platform-admin?tab=submissions', icon: ClipboardList },
    { name: 'Reviews', path: '/platform-admin?tab=reviews', icon: ShieldCheck },
    { name: 'AI Risk Monitor', path: '/platform-admin?tab=risk', icon: AlertTriangle },
    { name: 'Reports', path: '/platform-admin?tab=reports', icon: FileText }
  ],
  MSME: [
    { name: 'Workspace', path: '/msme', icon: Building },
    { name: 'Environmental Data', path: '/dashboard', icon: Leaf },
    { name: 'My Submissions', path: '/msme?tab=submissions', icon: FileSpreadsheet }
  ],
  ENTERPRISE: [
    { name: 'Dashboard', path: '/enterprise', icon: LayoutDashboard },
    { name: 'Environmental Data', path: '/dashboard', icon: Leaf },
    { name: 'Facilities', path: '/facilities', icon: Building },
    { name: 'Submissions', path: '/enterprise?tab=submissions', icon: ClipboardList },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  INVESTOR: [
    { name: 'Dashboard', path: '/investor', icon: LayoutDashboard },
    { name: 'Portfolio', path: '/investor?tab=companies', icon: Building },
    { name: 'ESG Profiles', path: '/investor?tab=performance', icon: BarChart3 },
    { name: 'Risk Insights', path: '/investor?tab=risk', icon: ShieldAlert },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  VERIFIER: [
    { name: 'Dashboard', path: '/verifier', icon: LayoutDashboard },
    { name: 'Review Queue', path: '/verifier?tab=queue', icon: Clock },
    { name: 'AI Risk Assessment', path: '/verifier?tab=ai-risk', icon: Bot },
    { name: 'Verification', path: '/verifier?tab=verification', icon: CheckCircle2 },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  AUDITOR: [
    { name: 'Dashboard', path: '/auditor', icon: LayoutDashboard },
    { name: 'Audit Queue', path: '/auditor?tab=audits', icon: Scale },
    { name: 'Evidence', path: '/evidence', icon: Paperclip },
    { name: 'Audit Trail', path: '/auditor?tab=history', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  REGULATOR: [
    { name: 'Dashboard', path: '/regulator', icon: LayoutDashboard },
    { name: 'Organizations', path: '/regulator?tab=organizations', icon: Building },
    { name: 'Submissions', path: '/regulator?tab=submissions', icon: FileSpreadsheet },
    { name: 'Risk Overview', path: '/regulator?tab=risk', icon: AlertTriangle },
    { name: 'Compliance', path: '/regulator?tab=compliance', icon: ShieldCheck },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  ASSOCIATION: [
    { name: 'Dashboard', path: '/association', icon: LayoutDashboard },
    { name: 'Members', path: '/association?tab=members', icon: Users },
    { name: 'ESG Benchmarking', path: '/association?tab=benchmarking', icon: BarChart3 },
    { name: 'Industry Insights', path: '/association?tab=insights', icon: TrendingUp },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  TECHNOLOGY_PROVIDER: [
    { name: 'Dashboard', path: '/technology-provider', icon: LayoutDashboard },
    { name: 'Integrations', path: '/technology-provider?tab=integrations', icon: Radio },
    { name: 'API Management', path: '/technology-provider?tab=api', icon: Code2 },
    { name: 'System Status', path: '/technology-provider?tab=status', icon: Cpu },
    { name: 'Logs', path: '/technology-provider?tab=logs', icon: ClipboardList }
  ],
  REGISTRY: [
    { name: 'Dashboard', path: '/registry', icon: LayoutDashboard },
    { name: 'Registry', path: '/registry?tab=registry', icon: FolderKanban },
    { name: 'Credits', path: '/carbon-credits', icon: Award },
    { name: 'Issuance', path: '/registry?tab=issuance', icon: Plus },
    { name: 'Retirement', path: '/registry?tab=retirement', icon: CheckCircle2 },
    { name: 'Audit Trail', path: '/registry?tab=audit-trail', icon: Database }
  ],
  CREDIT_BUYER: [
    { name: 'Dashboard', path: '/credit-buyer', icon: LayoutDashboard },
    { name: 'Marketplace', path: '/credit-buyer?tab=marketplace', icon: FolderKanban },
    { name: 'My Credits', path: '/credit-buyer?tab=my-credits', icon: Award },
    { name: 'Transactions', path: '/credit-buyer?tab=transactions', icon: DollarSign },
    { name: 'Certificates', path: '/credit-buyer?tab=certificates', icon: FileText }
  ],
  INSURER: [
    { name: 'Dashboard', path: '/insurer', icon: LayoutDashboard },
    { name: 'Organizations', path: '/insurer?tab=organizations', icon: Building },
    { name: 'Risk Profiles', path: '/insurer?tab=risk-profiles', icon: ShieldAlert },
    { name: 'Assessments', path: '/insurer?tab=assessments', icon: AlertTriangle },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  RESEARCHER: [
    { name: 'Dashboard', path: '/researcher', icon: LayoutDashboard },
    { name: 'Datasets', path: '/researcher?tab=datasets', icon: Database },
    { name: 'ESG Analytics', path: '/researcher?tab=analytics', icon: TrendingUp },
    { name: 'Benchmarking', path: '/researcher?tab=benchmarking', icon: BarChart3 },
    { name: 'Reports', path: '/reports', icon: FileText }
  ],
  ADVISOR: [
    { name: 'Dashboard', path: '/advisor', icon: LayoutDashboard },
    { name: 'Clients', path: '/advisor?tab=clients', icon: Building },
    { name: 'Recommendations', path: '/advisor?tab=recommendations', icon: Leaf },
    { name: 'Action Plans', path: '/advisor?tab=action-plans', icon: ClipboardList },
    { name: 'Reports', path: '/reports', icon: FileText }
  ]
};

// Aliases for role normalization
const roleAliasMap = {
  MSME_USER: 'MSME',
  ADMIN: 'ENTERPRISE',
  ORGANIZATION_ADMIN: 'ENTERPRISE',
  ESG_MANAGER: 'MSME',
  ENVIRONMENTAL_MANAGER: 'MSME',
  DATA_ENTRY: 'MSME',
  VIEWER: 'INVESTOR',
  EXECUTIVE: 'ENTERPRISE'
};

export function getNavigationForRole(role) {
  if (!role) return roleNavigationMap.MSME;
  const canonicalRole = roleAliasMap[role] || role;
  return roleNavigationMap[canonicalRole] || roleNavigationMap.MSME;
}

// Backwards compatibility export
export const masterNavigation = roleNavigationMap.MSME;
