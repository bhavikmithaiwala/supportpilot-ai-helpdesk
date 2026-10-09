import { Ticket } from '../models/index.js';
import { ApiError } from '../middleware/security.js';

export async function analyticsSummary(q: { from?: string; to?: string }) {
  if (q.from && q.to && q.from > q.to) throw new ApiError(400, 'Invalid date range');
  const match: any = {};
  if (q.from || q.to)
    match.createdAt = {
      ...(q.from ? { $gte: new Date(q.from) } : {}),
      ...(q.to ? { $lte: new Date(q.to) } : {}),
    };
  const [result] = await Ticket.aggregate([
    { $match: match },
    {
      $facet: {
        statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        trends: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        metrics: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              firstResponseMs: {
                $avg: {
                  $cond: [
                    { $ne: ['$firstRespondedAt', null] },
                    { $subtract: ['$firstRespondedAt', '$createdAt'] },
                    null,
                  ],
                },
              },
              resolutionMs: {
                $avg: {
                  $cond: [
                    { $ne: ['$resolvedAt', null] },
                    { $subtract: ['$resolvedAt', '$createdAt'] },
                    null,
                  ],
                },
              },
              backlog: {
                $sum: {
                  $cond: [{ $in: ['$status', ['new', 'open', 'waiting_on_customer']] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);
  return result;
}
