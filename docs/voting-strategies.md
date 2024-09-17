
### Three elector types

Community

Validators

Auditors

### Two validation levels

**First level:** 

Validation is done by electors from the community or the validators set:

| Selected from  | Random                                      | All                                    |
| -------------- | ------------------------------------------- | -------------------------------------- |
| Community      | min random members from the whole community | all members from the whole community   |
| Validators set | min random members from the validators set  | all validators from the validators set |
| Auditors set   | min random auditors from the auditors set   | all auditors from the auditors set     |

**Second level:** 

If auditing is enabled (frequency > 0) extra validation is done by auditors from the auditors set:

| Selected from | random                                    | all                                |
| ------------- | ----------------------------------------- | ---------------------------------- |
| Auditors set  | min random auditors from the auditors set | all auditors from the auditors set |

### Thresholds

**Quorum votes**: the minimum number of votes required to consider the claim of interest. If this threshold is not passed, the claim will be IGNORED, no matter how many positive votes it got.

**Required positives**: the minimum number of votes required to approve the claim.  If this threshold is not passed, the claim will be REJECTED.

These two threshold parameters enable a lot of different voting constraints, for example:

| Quorum          | Positives       | Strategy                                         |
| --------------- | --------------- | ------------------------------------------------ |
| 100 % of votes  | 100 % of votes  | Unanimous approval                               |
| > 75 % of votes | > 75 % of votes | Supermajority approval                           |
| > 75 % of votes | > 51 % of votes | High quorum,  Simple majority approval           |
| > 51 % of votes | > 51 % of votes | Simple majority quorum, Simple majority approval |

Thresholds can be expressed also as a fixed number instead of percentages:

### Result evaluation

| Quorum          | Positives             | Result   |
| --------------- | --------------------- | -------- |
| total >= quorum | positives >= required | APPROVED |
| total >= quorum | positives < required  | REJECTED |
| total < quorum  | positives >= required | IGNORED  |

