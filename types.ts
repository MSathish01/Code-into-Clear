export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  plainEnglishSummary: string;
  mermaidCode: string;
  juniorDevGuide: string;
}

export interface FileInput {
  name: string;
  content: string;
}