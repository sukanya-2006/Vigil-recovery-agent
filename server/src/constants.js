// Single source of truth for the string "enums" used across the schema.
// Since SQLite/Prisma can't enforce these at the database level, we
// enforce them here -- every place that writes one of these fields
// should import from this file rather than typing the string literal.

const TRANSACTION_STATUS = {
  FAILED: 'FAILED',
  RECOVERED: 'RECOVERED',
  LOST: 'LOST',
  PENDING_REVIEW: 'PENDING_REVIEW',
  RECOVERING: 'RECOVERING',
};

const FAILURE_REASON = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ISSUER_DECLINED: 'ISSUER_DECLINED',
  EXPIRED_CARD: 'EXPIRED_CARD',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  THREE_DS_FAILURE: 'THREE_DS_FAILURE',
  OTHER: 'OTHER',
};

const ACTION_TYPE = {
  RETRY: 'RETRY',
  REMINDER: 'REMINDER',
  UPDATE_METHOD: 'UPDATE_METHOD',
  ESCALATE: 'ESCALATE',
  STOP: 'STOP',
  NO_ACTION: 'NO_ACTION',
};

const ACTION_RESULT = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  PENDING: 'PENDING',
};

module.exports = {
  TRANSACTION_STATUS,
  FAILURE_REASON,
  ACTION_TYPE,
  ACTION_RESULT,
};
