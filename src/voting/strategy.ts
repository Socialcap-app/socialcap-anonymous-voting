/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomInt } from "crypto";
import { Group } from "../semaphore/index.js";
import logger from "../services/logger.js";
import { getGroupMembers } from "../services/groups.js";

export {
  type PlanStrategy,
  runStrategy
}

interface PlanStrategy {
  planUid: string;
  name: string;
  source: string; // 'validators' | 'auditors' | 'all',
  variant: string; // 'random' | 'all';  
  minAuditors: number;
  minValidators: number;
  auditFrequency: number;
}

const getMembers: any = {
  'community': getAllMembers,
  'validators': getValidatorMembers,
  'auditors': getAuditorMembers
};

const selectUsing: any = {
  'random': selectRandom,
  'all': selectAll
}

function runStrategy(
  strategy: PlanStrategy,
  communityUid: string
) {
  logger.info(`Selecting validators from ${communityUid} ...`)

  // first we need to select the electors from the required source
  const electors = selectUsing[strategy.variant](
    getMembers[strategy.source](communityUid), 
    strategy.minValidators
  );
  logger.info(`Selected ${electors.length} validators from ${communityUid} ...`)

  // we may not need auditing, in that case we are done
  if (!isAuditable(strategy)) 
    return electors;

  // if we need auditing, 
  // electors will allways be selected from the auditors set 
  const auditors = selectUsing[strategy.variant](
    getAuditorMembers(communityUid), 
    strategy.minAuditors
  )  
  return electors.concat(auditors);
}

/// Cache for members so we do not to reload members all the time
const CACHE_MEMBERS : any = {};

/** Get all the community members */
function getAllMembers(communityUid: string) {
  const group = Group.create('communities.{}.members', communityUid);
  const guid = group!.guid;
  if (CACHE_MEMBERS[guid]) return CACHE_MEMBERS[guid];
  CACHE_MEMBERS[guid] = getGroupMembers(guid);
  return CACHE_MEMBERS[guid];
}

/** Get the validator members */
function getValidatorMembers(communityUid: string) {
  const group = Group.create('communities.{}.validators', communityUid);
  const guid = group!.guid;
  if (CACHE_MEMBERS[guid]) return CACHE_MEMBERS[guid];
  CACHE_MEMBERS[guid] = getGroupMembers(guid);
  return CACHE_MEMBERS[guid];
}

/** Get the  auditor members */
function getAuditorMembers(communityUid: string) {
  const group = Group.create('communities.{}.auditors', communityUid);
  const guid = group!.guid;
  if (CACHE_MEMBERS[guid]) return CACHE_MEMBERS[guid];
  CACHE_MEMBERS[guid] = getGroupMembers(guid);
  return CACHE_MEMBERS[guid];
}
  
/** Is an auditable claim and we must add auditors to it ? */
function isAuditable(strategy: PlanStrategy): boolean {
  // do we have to audit now ? just throw a number :-)
  const frequency = strategy.auditFrequency;
  let needsAudit = (frequency > 0) && (randomInt(frequency+1) === frequency) 
  return needsAudit;
}

/** Selects all members from the given set. */
// Note: 'min' is requier for compatibility with selectRandom
function selectAll(members: string[], min: number): string[] {
  return members;
}  

/** Selects 'min' not repeated members from the given set */
function selectRandom(members: string[], min: number): string[] {
  const n = (members || []).length;
  let selected: any = {};

  // do we have enough ?
  if (n < min) {
    logger.error(`We can not proceed, not enough members ${n} < ${min}`);
    return [];
  }

  let count = 0;
  while (count < min) {
    const k = randomInt(n); // select one from the array
    const uid = members[k];
    if (! selected[uid]) {
      selected[uid] = members[k];
      count++;
    }
  }

  // return as an array
  return Object.keys(selected).map((uid) => selected[uid]);
}
