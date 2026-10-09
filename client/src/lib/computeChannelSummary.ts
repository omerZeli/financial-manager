// The investment event-sourcing engine now lives in the shared package
// (@financial-manager/shared). This module re-exports it so existing client
// imports keep working unchanged.
export { computeChannelSummary, CASH_PATH_LABEL } from '@financial-manager/shared'
export type { ChannelSummary } from '@financial-manager/shared'
