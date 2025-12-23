export interface BookSource {
  id: string;
  title: string;
  originalUrl: string;
  jsonUrl: string;
}

export interface ScrapeResult {
  success: boolean;
  data: BookSource[];
  error?: string;
}

export enum ScrapeStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface AnalysisResult {
  summary: string;
  tags: string[];
}
