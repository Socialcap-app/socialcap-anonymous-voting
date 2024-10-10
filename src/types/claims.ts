export interface VotingClaim {
  uid: string; 
  status: number; // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
  electors: string[]; // the identity commitment of each elector
  assignedUTC: string; // when it was assigned
  metadata: string; // metadata for this claim, will be used by electors
  error: any | null; // if any errors happened, we store it here
}
