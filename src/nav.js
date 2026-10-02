import { LayoutDashboard, Scissors, FolderKanban, BarChart3, KeyRound, Activity, CreditCard, Building2, Settings, HelpCircle, Palette, Rocket } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Workspace', items: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, sub: 'Your garment automation at a glance.' },
    { id: 'fashion', label: 'Fashion OS', icon: Rocket, sub: 'Run products from capture to production and store.' },
    { id: 'studio', label: 'Pattern Studio', icon: Scissors, sub: 'Turn a garment photo into pattern assets.' },
    { id: 'lab', label: 'Design Lab', icon: Palette, sub: 'Prints, colourways, flats, mockups, aso-ebi styles and listings.' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, sub: 'Every pattern job your team has run.' },
  ]},
  { label: 'Developers', items: [
    { id: 'keys', label: 'API Keys', icon: KeyRound, sub: 'Server-side credentials for your integration.' },
    { id: 'usage', label: 'Usage', icon: Activity, sub: 'Processed images against your monthly allowance.' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, sub: 'What your team is making.' },
  ]},
  { label: 'Account', items: [
    { id: 'billing', label: 'Billing', icon: CreditCard, sub: 'Your API Growth subscription.' },
    { id: 'company', label: 'Company', icon: Building2, sub: 'Workspace and team details.' },
    { id: 'settings', label: 'Settings', icon: Settings, sub: 'Your profile and sign-in.' },
    { id: 'help', label: 'Help & Docs', icon: HelpCircle, sub: 'Guides, licensing and support.' },
  ]},
];

export const NAV = NAV_GROUPS.flatMap((g) => g.items);
