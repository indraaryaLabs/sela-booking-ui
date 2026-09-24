# Sela — frontend portfolio design

## Goal and alternatives

Build a distinct junior-frontend portfolio piece: a complete, responsive room-booking journey that can be opened and tested without an account. A booking flow shows UI composition, state management, form handling, asynchronous data, and edge cases more clearly than another static landing page or dashboard. We considered an e-commerce checkout (too much payment ambiguity) and another operations dashboard (overlaps Reliability Command Center); a small booking product is the better complement.

## Product boundary

Sela is an Indonesian-language **interactive concept**, not a real venue. Three fictional rooms have different capacity and hourly rates. A visitor selects a room, date in the next 14 days, and a two-hour slot; enters contact and meeting details; reviews the choice; and receives a local confirmation. No payment, actual inventory, email, account, or server persistence is implied. A visible note makes this clear.

## Architecture and data flow

React and TypeScript render the product with a small component set. A static JSON endpoint supplies weekly blocked-slot rules through `fetch`; the app owns loading, failed-fetch, retry, and empty-availability states. Booking records are written to `localStorage` after client-side validation, then prevent double-booking within that browser. A storage failure produces an error rather than a false success. Data types and availability rules live outside the view component.

## Visual direction

Warm editorial utility: paper-colored canvas, near-black ink, sharp citrus accent, generous typographic hierarchy, thin rules, and architectural room illustrations made in CSS. The interface uses an expressive serif for major headings and a legible sans for controls. The reservation pane remains clear on desktop and stacks naturally on narrow screens. Motion is restrained and disabled under reduced-motion preferences.

## Acceptance and non-goals

- Complete browse → room → date → slot → details → confirmation flow with honest local-demo wording.
- Keyboard-reachable controls, associated labels, visible focus, meaningful error/status messages, and no horizontal overflow at common mobile widths.
- Browser tests for happy path, validation, failed availability request/retry, and browser-local slot conflict.
- Production build and visual inspection of desktop and mobile screenshots.
- No backend, real availability claim, real email, payment flow, analytics, or copied template assets.
