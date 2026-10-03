import { LayoutDashboard, Box, Scissors, FolderKanban, BarChart3, KeyRound, Activity, CreditCard, Building2, Settings, HelpCircle, Palette, Images, Factory, BookOpen, Sparkles, FolderOpen, Users, Bot, Shirt, Ruler, FileText, Kanban, ShieldCheck, Database, Search, Image as ImageIcon } from 'lucide-react';

const fashionItems = [
  { id:'fashion-command', label:'Command Center', icon:LayoutDashboard, sub:'Fashion production at a glance.' },
  { id:'fashion-capture', label:'Product Capture', icon:Images, sub:'Capture and structure new products.' },
  { id:'garment-library', label:'Garment Library', icon:Shirt, sub:'Search and manage every garment record.' },
  { id:'fabric-library', label:'Fabric Library', icon:Palette, sub:'African fabrics, prints and material intelligence.' },
  { id:'pinterest-research', label:'Pinterest Research', icon:Search, sub:'Search visual inspiration and send references to Pattern Studio.' },
  { id:'inspiration-library', label:'Inspiration Library', icon:ImageIcon, sub:'Browse the shared African fashion library and keep approved references.' },
  { id:'fashion-factory', label:'Bulk Product Factory', icon:Factory, sub:'Process product batches at scale.' },
  { id:'measurement-studio', label:'Measurements & Size Profiles', icon:Ruler, sub:'Size profiles and garment fit systems.' },
  { id:'tech-packs', label:'Tech Pack Builder', icon:FileText, sub:'Create production-ready technical packages.' },
  { id:'production-board', label:'Production Board', icon:Kanban, sub:'Move products through the production pipeline.' },
  { id:'quality-control', label:'AI Quality Control', icon:ShieldCheck, sub:'Audit extraction, patterns and production readiness.' },
  { id:'fashion-collections', label:'Collections', icon:BookOpen, sub:'Build collections, lookbooks and catalogues.' },
  { id:'fashion-marketing', label:'Marketing Factory', icon:Sparkles, sub:'Listings, SEO and campaign content.' },
  { id:'fashion-library', label:'Asset Library', icon:FolderOpen, sub:'Search all generated fashion assets.' },
  { id:'integrations', label:'Apps & Integrations', icon:Database, sub:'Connect commerce, creative, commerce and storage systems.' },
  { id:'fashion-team', label:'Team & Brand', icon:Users, sub:'Team permissions and brand kit.' },
  { id:'assistant', label:'AI Assistant', icon:Bot, sub:'Ask AI about your workspace.' },
];

export const NAV_GROUPS = [
  { label:'Workspace', items:[
    {id:'overview',label:'Overview',icon:LayoutDashboard,sub:'Your garment automation at a glance.'},
    {id:'studio',label:'Pattern Studio',icon:Scissors,sub:'Turn a garment photo into pattern assets.'},
    {id:'fit-models',label:'3D Fit Models',icon:Box,sub:'Rotate, light and size every fitting body.'},
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
