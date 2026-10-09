// Date utilities now live in the shared package so both the client and the
// MCP server use identical, timezone-safe implementations. Re-exported here so
// existing client imports (`@/lib/dateUtils`) keep working with zero behavior
// change.
export { formatLocalDate, todayStr, getEffectiveDate } from '@financial-manager/shared'
