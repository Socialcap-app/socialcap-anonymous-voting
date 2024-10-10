export interface PlanStrategy {
  //planUid: string;
  name: string;
  source: string; // 'validators' | 'auditors' | 'all',
  variant: string; // 'random' | 'all';  
  minAuditors: number;
  minValidators: number;
  auditFrequency: number;
  requiredVotes?: number;
  requiredPositives?: number;
}
