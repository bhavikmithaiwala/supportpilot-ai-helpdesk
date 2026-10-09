import mongoose from 'mongoose';
import { Attachment, TicketEvent } from '../models/index.js';
import { ApiError, type Identity } from '../middleware/security.js';
import { visibleTicket } from './tickets.js';

export async function addAttachment(
  id: string,
  identity: Identity,
  input: { name: string; content: string },
) {
  const bytes = Buffer.from(input.content, 'utf8');
  if (bytes.length > 16384 || input.content.includes('\0'))
    throw new ApiError(400, 'Only UTF-8 text up to 16 KiB is allowed');
  let result: { _id: unknown; name: string; size: number } | undefined;
  await mongoose.connection.transaction(async (session) => {
    const ticket = await visibleTicket(id, identity);
    ticket.$session(session);
    if (identity.role === 'customer' && ticket.status === 'closed')
      throw new ApiError(409, 'Closed tickets are read only');
    if ((await Attachment.countDocuments({ ticketId: ticket._id }).session(session)) >= 10)
      throw new ApiError(409, 'Ticket attachment limit reached');
    // The ticket write serializes concurrent attachment uploads as well as staff edits.
    ticket.increment();
    ticket.updatedAt = new Date();
    await ticket.save({ session });
    const [attachment] = await Attachment.create(
      [
        {
          ticketId: ticket._id,
          createdBy: identity.id,
          name: input.name,
          bytes,
          size: bytes.length,
        },
      ],
      { session },
    );
    await TicketEvent.create(
      [
        {
          ticketId: ticket._id,
          actorId: identity.id,
          type: 'attachment_added',
          after: { filename: input.name },
        },
      ],
      { session },
    );
    result = { _id: attachment!._id, name: attachment!.name, size: attachment!.size };
  });
  return result!;
}
