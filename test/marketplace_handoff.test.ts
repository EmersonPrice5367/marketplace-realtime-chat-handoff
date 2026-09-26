import test from 'node:test';
import assert from 'node:assert/strict';
import { planMarketplaceChat } from '../src/marketplace_handoff.js';

test('ready asset moves to buyer update and keeps the handoff visible', () => {
  const decision = planMarketplaceChat({
    listingId: 'listing_204',
    sellerId: 'seller_7',
    buyerId: 'buyer_19',
    room: 'room_88',
    assetState: 'ready',
    buyerNote: 'Can you confirm sizing?',
    orderId: 'order_501'
  });

  assert.equal(decision.channel, 'marketplace.room_88');
  assert.equal(decision.nextState, 'buyer-updated');
  assert.equal(decision.publishEvent, 'buyer.message.posted');
  assert.deepEqual(decision.publishData, {
    listingId: 'listing_204',
    buyerId: 'buyer_19',
    buyerNote: 'Can you confirm sizing?'
  });
});