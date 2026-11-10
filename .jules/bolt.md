## 2026-10-27 - Prevent Cascading Re-renders in Long Lists\n**Learning:** When using React intervals in a parent component (like LeadsTable) to update timestamps, it causes the entire list of elements to re-render. Since we don't have virtualization, this represents a significant O(n) performance hit every minute.\n**Action:** Push high-frequency updating state (like elapsed time) down into individual child components (UrgencyTimer) to isolate re-renders strictly to the nodes that actually change.

## 2026-10-27 - Prevent Cascading Re-renders in Large Lists
**Learning:** Transient UI state like `copiedId` (tracking which button was clicked) when stored in a parent component managing a large list forces the entire list and all its children to re-render. Similarly, unconditionally updating state from polling (even if data hasn't changed) causes massive unnecessary background re-rendering.
**Action:** Extract granular UI states into dedicated child components (e.g., `CopyButton`) to isolate re-renders. Always use equality checks (`JSON.stringify` or deep equals) before updating list state from polling or subscriptions.

## 2024-10-31 - [Extract Transient UI State from Lists]
**Learning:** In large React list mappings (like `LeadsTable`), maintaining transient UI states (such as toggling an accordion or viewing extra data) in the parent component causes the entire list to re-render. This O(N) cost for an O(1) change can be a significant performance bottleneck.
**Action:** Always extract complex transient UI state (e.g. `isExpanded`, timers, copy statuses) into isolated child components so that state updates restrict re-renders strictly to the component instance experiencing the interaction.

## 2024-11-03 - [Prevent O(N) Re-renders via List Item Memoization]
**Learning:** Rendering complex items directly inside a `.map` loop in a parent component that frequently updates its state (e.g., via polling or optimistic UI toggles) causes an O(N) re-render of the entire list. Even if granular UI states are extracted, the parent state update forces all un-memoized children to re-render.
**Action:** Always extract list items into a `React.memo`-wrapped child component and ensure event handler props passed from the parent are stabilized using `useCallback`. This guarantees O(1) re-renders when only a single item changes or the parent receives unchanged polling data. Ensure the component passed to `memo` is a named function to avoid ESLint `react/display-name` errors.

## 2026-11-06 - [Prevent O(N) Re-renders in Lists Updated by API Polling]
**Learning:** When a list is populated by API polling (like `fetchLeads()`), every poll returns new object references for *every* item in the list, even if the underlying data hasn't changed. Standard `React.memo` uses shallow equality, which fails when given new object references, causing an O(N) re-render of the entire list.
**Action:** Always provide a custom equality comparison function to `React.memo` (e.g., using deep equality like `JSON.stringify(prevProps.item) === JSON.stringify(nextProps.item)`) when the list is driven by network requests or polling that mints new object references. This restores O(1) rendering performance.

## 2026-11-12 - [Add Database Index for Polling State Columns]
**Learning:** Background jobs (like `process-leads` cron) frequently poll the database using `WHERE` clauses on state columns (e.g., `processing_status = 'pending'`). Without an index, this forces the database to perform O(N) full table scans, which becomes a severe bottleneck as the leads dataset grows.
**Action:** Always add an index to state columns (e.g., via `CREATE INDEX IF NOT EXISTS`) that are frequently queried in background processing polling to prevent database bottlenecks and O(N) scans.
