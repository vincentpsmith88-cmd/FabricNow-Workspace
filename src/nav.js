import { LayoutDashboard, Scissors, FolderKanban, BarChart3, KeyRound, Activity, CreditCard, Building2, Settings, HelpCircle, Palette, Images, Factory, BookOpen, Sparkles, FolderOpen, Store, Users, Bot } from 'lucide-react';

const fashionItems = [
  { id:'fashion-command', label:'Command Center', icon:LayoutDashboard, sub:'Fashion production at a glance.' },
  { id:'fashion-capture', label:'Product Capture', icon:Images, sub:'Capture and structure new products.' },
  { id:'fashion-factory', label:'Bulk Factory', icon:Factory, sub:'Process product batches at scale.' },
  { id:'fashion-production', label:'Production & Tech Packs', icon:Scissors, sub:'Measurements, BOMs and production packages.' },
  { id:'fashion-collections', label:'Collections', icon:BookOpen, sub:'Build collections, lookbooks and catalogues.' },
  { id:'fashion-marketing', label:'Marketing Factory', icon:Sparkles, sub:'Listings, SEO and campaign content.' },
  { id:'fashion-library', label:'Asset Library', icon:FolderOpen, sub:'Search all generated fashion assets.' },
  { id:'fashion-store', label:'Store & API', icon:Store, sub:'Store feeds, integrations and developer API.' },
  { id:'fashion-team', label:'Team & Brand', icon:Users, sub:'Team permissions and brand kit.' },
  { id:'assistant', label:'AI Assistant', icon:Bot, sub:'Ask Gemini about your workspace.' },
];

export const NAV_GROUPS = [
  { label:'Workspace', items:[
    {id:'overview',label:'Overview',icon:LayoutDashboard,sub:'Your garment automation at a glance.'},
    {id:'studio',label:'Pattern Studio',icon:Scissors,sub:'Turn a garment photo into pattern assets.'},
    {id:'lab',label:'Design Lab',icon:Palette,sub:'Prints, colourways, flats, mockups, aso-ebi styles and listings.'},
    {id:'projects',label:'Projects',icon:FolderKanban,sub:'Every pattern job your team has run.'},
  ]},
  { label:'Fashion OS', items:fashionItems },
  { label:'Developers', items:[
    {id:'keys',label:'API Keys',icon:KeyRound,sub:'Server-side credentials for your integration.'},
    {id:'usage',label:'Usage',icon:Activity,sub:'Processed images against your monthly allowance.'},
    {id:'analytics',label:'Analytics',icon:BarChart3,sub:'What your team is making.'},
  ]},
  { label:'Account', items:[
    {id:'billing',label:'Billing',icon:CreditCard,sub:'Your API Growth subscription.'},
    {id:'company',label:'Company',icon:Building2,sub:'Workspace and team details.'},
    {id:'settings',label:'Settings',icon:Settings,sub:'Your profile and sign-in.'},
    {id:'help',label:'Help & Docs',icon:HelpCircle,sub:'Guides, licensing and support.'},
  ]},
];
export const NAV = NAV_GROUPS.flatMap(g=>g.items);
