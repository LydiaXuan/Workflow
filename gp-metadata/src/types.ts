export type KeywordCategory = 'action' | 'entity' | 'emotion' | 'genre';

export interface KeywordMetric {
  word: string;
  count: number;
  density: number; // Percentage e.g. 2.4
  category: KeywordCategory;
  translation?: string;
}

export interface CompetitorInfo {
  id: string;
  name: string;
  url: string;
  isPinned?: boolean;
  packageName?: string;
  developer?: string;
  iconUrl?: string;
  title: string;
  titleZh: string;
  shortDescription: string;
  shortDescriptionZh: string;
  longDescription: string;
  longDescriptionZh: string;
  downloads: string;
  rating: number;
  category: string;
  keywords: KeywordMetric[];
  coreFeatures: string[];
  commonPoints: string[];
  differentiationPoints: string[];
  events?: any[];
  featureGraphicUrl?: string;
  screenshots?: string[];
  promoVideoUrl?: string;
}

export interface ShortDescriptionVariant {
  type: 'benefit' | 'scenario' | 'ranking';
  label: string;
  focus: string; // e.g. "利益点向", "场景向", "纯排名向"
  text: string;
  textZh?: string;
  charCount: number;
  emojiCount: number;
}

export interface KeywordCoverageItem {
  word: string;
  tier: 'Tier 1 (核心词)' | 'Tier 2 (次级词)' | 'Tier 3 (长尾词)';
  inTitle: boolean;
  inShortDesc: boolean;
  inLongDescAboveFold: boolean;
  inLongDescBody: boolean;
  inLongDescCta: boolean;
  countInLongDesc: number;
  densityPercent: number; // e.g. 2.4%
  status: 'optimal' | 'warning' | 'missing';
}

export interface FeatureAuthenticityItem {
  feature: string;
  inSourceList: boolean;
  section: string;
}

export interface AsoQualityReport {
  overallPass: boolean;
  keywordCoverage: KeywordCoverageItem[];
  featureAuthenticity: FeatureAuthenticityItem[];
  policyChecks: {
    rule: string;
    passed: boolean;
    detail: string;
  }[];
}

export interface AsoCopy {
  appName: string;
  title: string;
  titleZh?: string;
  shortDescription: string;
  shortDescriptionZh?: string;
  shortDescriptionVariants?: ShortDescriptionVariant[];
  longDescription: string;
  longDescriptionZh?: string;
  targetKeywords: string[];
  tier1Keywords?: string[];
  tier2Keywords?: string[];
  tier3Keywords?: string[];
  subGenre: string;
  locale?: string;
  visualTone?: string;
  qualityReport?: AsoQualityReport;
}

export interface ReleaseNotesVariant {
  highlights: string;
  concise: string;
  exciting: string;
}

export interface ReleaseNotes {
  version: string;
  english: ReleaseNotesVariant;
  chinese: ReleaseNotesVariant;
}

export interface StoreScreenshot {
  id: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  bgColor: string;
  mockType: 'demolition' | 'physics' | 'cannon' | 'levels' | 'rewards';
}

export interface Project {
  id: string;
  name: string;
  isPinned?: boolean;
  packageName: string;
  category: string;
  updatedAt: string;
  targetKeywords: string[];
  competitors: CompetitorInfo[];
  asoCopy: AsoCopy;
  releaseNotes?: ReleaseNotes;
}

export interface RecycledCompetitor {
  id: string;
  competitor: CompetitorInfo;
  projectId: string;
  projectName: string;
  deletedAt: string;
}

