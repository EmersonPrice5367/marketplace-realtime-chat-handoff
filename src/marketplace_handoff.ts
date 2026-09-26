import { z } from 'zod';
import { infrai } from './infrai_client.js';

export const MarketplaceEventSchema = z.object({
  listingId: z.string().min(1),
  sellerId: z.string().min(1),
  buyerId: z.string().min(1),
  room: z.string().min(1),
  assetState: z.enum(['draft', 'ready', 'sent']),
  buyerNote: z.string().min(1),
  orderId: z.string().min(1)
});

export type MarketplaceEvent = z.infer<typeof MarketplaceEventSchema>;

export type MarketplaceDecision = {
  channel: string;
  nextState: 'asset-ready' | 'buyer-updated' | 'handoff-issued';
  publishEvent: string;
  publishData: Record<string, unknown>;
  checklist: string[];
};

export function planMarketplaceChat(input: MarketplaceEvent): MarketplaceDecision {
  const channel = `marketplace.${input.room}`;
  if (input.assetState === 'draft') {
    return {
      channel,
      nextState: 'asset-ready',
      publishEvent: 'seller.asset.ready',
      publishData: { listingId: input.listingId, sellerId: input.sellerId, assetState: 'ready' },
      checklist: ['Create the channel', 'Publish the seller asset update', 'Share the room token with buyer and seller']
    };
  }
  if (input.assetState === 'ready') {
    return {
      channel,
      nextState: 'buyer-updated',
      publishEvent: 'buyer.message.posted',
      publishData: { listingId: input.listingId, buyerId: input.buyerId, buyerNote: input.buyerNote },
      checklist: ['Create the channel', 'Publish the buyer update', 'Confirm presence before handoff']
    };
  }
  return {
    channel,
    nextState: 'handoff-issued',
    publishEvent: 'order.handoff.issued',
    publishData: { orderId: input.orderId, room: input.room, sellerId: input.sellerId, buyerId: input.buyerId },
    checklist: ['Create the channel', 'Publish the order handoff', 'Rotate everyone to the order thread']
  };
}

export async function runMarketplaceChat(input: MarketplaceEvent) {
  const decision = planMarketplaceChat(input);
  await infrai.realtime.channel.create({ channel: decision.channel, type: 'chat', vendor: 'marketplace' });
  await infrai.realtime.publish({ channel: decision.channel, event: decision.publishEvent, data: decision.publishData, account_id: input.sellerId });
  return decision;
}

if (process.argv[1]?.endsWith('marketplace_handoff.js')) {
  const parsed = MarketplaceEventSchema.parse(JSON.parse(process.env.MARKETPLACE_EVENT ?? '{"listingId":"listing_204","sellerId":"seller_7","buyerId":"buyer_19","room":"room_88","assetState":"ready","buyerNote":"Can you confirm sizing?","orderId":"order_501"}'));
  runMarketplaceChat(parsed).then((decision) => {
    console.log(JSON.stringify(decision, null, 2));
  });
}