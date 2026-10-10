// Service layer: investment summaries and return-over-time composition.
//
// The service layer sits between the data-access readers (data/*.ts) and the
// tool modules (tools/*.ts). Its job is to COMPOSE raw data reads with the pure
// computations extracted into `@financial-manager/shared`, returning a shaped
// result the tool can serialize directly.
//
// Both functions here fan three readers (channels, deposits, value updates)
// into the shared event-sourcing engine, so centralizing the composition keeps
// every tool handler a thin adapter and makes the logic trivially unit-testable
// in isolation.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeInvestmentSummaries,
  computeReturnOverTime,
  type ChannelSummaryWithMeta,
  type ReturnPoint,
} from '@financial-manager/shared';
import { fetchChannels } from '../data/channels.js';
import { fetchDeposits } from '../data/deposits.js';
import { fetchValueUpdates } from '../data/valueUpdates.js';

/**
 * Filters accepted by the per-channel investment summaries. Mirrors the
 * `get_investment_summaries` tool catalog entry (channelId, isPension).
 */
export interface InvestmentSummariesFilters {
  channelId?: string;
  isPension?: boolean;
}

/**
 * Fetch the (RLS-scoped) channels, deposits and value updates, then run each
 * channel through the shared event-sourcing engine.
 *
 * Composition only - `computeInvestmentSummaries` replays every event per
 * channel (treating `CASH_PATH_LABEL` channels as cash) to produce balance,
 * invested capital and return. The `channelId` / `isPension` filters restrict
 * which channels are summarized; the full deposit/value-update sets are passed
 * through so each channel's engine sees all of its own events.
 *
 * Zero matching channels is a valid, non-error outcome: an empty channel list
 * yields `[]`.
 */
export async function getInvestmentSummaries(
  client: SupabaseClient,
  filters: InvestmentSummariesFilters = {},
): Promise<ChannelSummaryWithMeta[]> {
  const [channels, deposits, valueUpdates] = await Promise.all([
    fetchChannels(client, { isPension: filters.isPension }),
    fetchDeposits(client, { channelId: filters.channelId }),
    fetchValueUpdates(client, { channelId: filters.channelId }),
  ]);

  const selected = filters.channelId
    ? channels.filter(ch => ch.id === filters.channelId)
    : channels;

  return computeInvestmentSummaries({
    channels: selected,
    deposits,
    valueUpdates,
  });
}

/**
 * Filters accepted by the return-over-time series. Mirrors the
 * `get_investment_return_over_time` tool catalog entry (channelId, isPension,
 * dateFrom, dateTo).
 */
export interface ReturnOverTimeFilters {
  channelId?: string;
  isPension?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Fetch the (RLS-scoped) channels, deposits and value updates and compute the
 * portfolio return percentage at each month-end checkpoint.
 *
 * Composition only - `computeReturnOverTime` derives a last-day-of-month series
 * from the earliest event through today and replays all events on/before each
 * sample date (cash channels are treated as regular here, mirroring the client
 * charts page). Unlike the client, the display-only 18-month slice is NOT
 * applied; instead the explicit `dateFrom`/`dateTo` filters trim the full
 * series to the requested range, returning every computed point within it.
 *
 * Zero matching channels / events is a valid, non-error outcome: an empty
 * series yields `[]`.
 */
export async function getReturnOverTime(
  client: SupabaseClient,
  filters: ReturnOverTimeFilters = {},
): Promise<ReturnPoint[]> {
  const [channels, deposits, valueUpdates] = await Promise.all([
    fetchChannels(client, { isPension: filters.isPension }),
    fetchDeposits(client, { channelId: filters.channelId }),
    fetchValueUpdates(client, { channelId: filters.channelId }),
  ]);

  const selected = filters.channelId
    ? channels.filter(ch => ch.id === filters.channelId)
    : channels;

  let points = computeReturnOverTime({
    channels: selected,
    deposits,
    valueUpdates,
  });

  if (filters.dateFrom) points = points.filter(p => p.date >= filters.dateFrom!);
  if (filters.dateTo) points = points.filter(p => p.date <= filters.dateTo!);

  return points;
}
