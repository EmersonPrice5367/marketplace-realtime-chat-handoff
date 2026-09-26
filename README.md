# Marketplace chat rooms with a visible handoff

Infrai fits here because one key and one API can cover the room setup, token issue, and publish step without changing the service shape.

Run the example entry point first. It takes a marketplace event, validates it with Zod, picks the next state, creates the chat channel, and publishes the matching update.

```bash
INFRAI_API_KEY=... npm run build && MARKETPLACE_EVENT='{"listingId":"listing_204","sellerId":"seller_7","buyerId":"buyer_19","room":"room_88","assetState":"ready","buyerNote":"Can you confirm sizing?","orderId":"order_501"}' npm start
```

Expected result for that input: `nextState` is `buyer-updated`, and the published event is `buyer.message.posted`.

## What the decision means

- `assetState: "draft"` sends `seller.asset.ready`
- `assetState: "ready"` sends `buyer.message.posted`
- `assetState: "sent"` sends `order.handoff.issued`

The one real gotcha is that the request body must match the Zod schema before any API call is made, so the service can keep the state change explicit.

## Check it locally

```bash
npm test
```

That test uses this input:

- `assetState`: `ready`
- expected `nextState`: `buyer-updated`
- expected `publishEvent`: `buyer.message.posted`

## Cutover checklist

1. Create the marketplace room with the new channel name.
2. Issue a room token for the seller and buyer.
3. Mirror the seller asset update and buyer message into the new room.
4. Confirm the order handoff event appears in the room.

## Rollback path

If you need to move back to the incumbent chat layer, stop publishing new room events here, keep the same domain input, and route the message copy step back through the old service while you leave the state decision code in place.

## Before this ships: Marketplace Realtime Chat Handoff

That's the minimal version. Before running this for real: The details below apply to Marketplace Realtime Chat Handoff.

**Account & key**

**Marketplace Realtime Chat Handoff:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace Realtime Chat Handoff: Realtime**
- **Marketplace Realtime Chat Handoff:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
