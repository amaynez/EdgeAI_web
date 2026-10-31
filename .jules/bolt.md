## 2026-10-27 - Prevent Cascading Re-renders in Long Lists\n**Learning:** When using React intervals in a parent component (like LeadsTable) to update timestamps, it causes the entire list of elements to re-render. Since we don't have virtualization, this represents a significant O(n) performance hit every minute.\n**Action:** Push high-frequency updating state (like elapsed time) down into individual child components (UrgencyTimer) to isolate re-renders strictly to the nodes that actually change.

## 2026-10-27 - Prevent Cascading Re-renders in Large Lists
**Learning:** Transient UI state like `copiedId` (tracking which button was clicked) when stored in a parent component managing a large list forces the entire list and all its children to re-render. Similarly, unconditionally updating state from polling (even if data hasn't changed) causes massive unnecessary background re-rendering.
**Action:** Extract granular UI states into dedicated child components (e.g., `CopyButton`) to isolate re-renders. Always use equality checks (`JSON.stringify` or deep equals) before updating list state from polling or subscriptions.

## 2024-10-31 - [Extract Transient UI State from Lists]
**Learning:** In large React list mappings (like `LeadsTable`), maintaining transient UI states (such as toggling an accordion or viewing extra data) in the parent component causes the entire list to re-render. This O(N) cost for an O(1) change can be a significant performance bottleneck.
**Action:** Always extract complex transient UI state (e.g. `isExpanded`, timers, copy statuses) into isolated child components so that state updates restrict re-renders strictly to the component instance experiencing the interaction.
