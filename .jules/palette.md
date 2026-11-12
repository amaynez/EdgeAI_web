## 2024-06-25 - Accessibility Check
**Learning:** The `AuditLeadForm` component currently lacks `required` attributes and visual required indicators on its text inputs (name, email, company, role). Additionally, an aria-required attribute or required marker on the labels is missing to guide screen readers.
**Action:** Add required attributes to inputs and required indicators (*) to labels for accessibility.
## $(date +%Y-%m-%d) - Add Tooltips to Disabled Elements and Hide Decorative SVGs
**Learning:** In the LeadsTable, the "Copy" button becomes disabled dynamically when a draft email isn't available, but provided no visual explanation. Also, multiple inline SVGs lacked ARIA attributes, causing unnecessary screen reader verbosity.
**Action:** When conditionally disabling buttons, ensure a dynamic `title` tooltip is provided to explain *why* it is disabled. For inline SVG icons paired with visible text (e.g., inside buttons or data toggles), add `aria-hidden="true"` to prevent screen readers from announcing them redundantly.
## 2024-11-05 - Native HTML5 Tooltips on Disabled Elements
**Learning:** Native `title` attributes (tooltips) do not function on `disabled` form elements in modern browsers (Chrome, Firefox, Safari) because disabled elements inherently suppress mouse events (like `mouseenter` or `mouseover`), which are required to trigger the tooltip display. Attempting to explain a disabled state purely through a native tooltip is ineffective.
**Action:** Do not use `title` to explain why a button is disabled. Instead, if context is needed, either dynamically update the button's visible text (e.g., from 'Submit' to 'Sending...') or provide an adjacent, visually hidden or non-disabled element (like a small helper text) to convey the state change or reason for disablement.
## $(date +%Y-%m-%d) - ARIA Label Syncing with Visual Text
**Learning:** When dynamically updating the visual text of an element (like changing "Copy as Rich Text" to "Draft Unavailable" when a button is disabled), failing to update the `aria-label` creates a desync where screen readers announce outdated or confusing information compared to what sighted users see.
**Action:** Always ensure that `aria-label` or `aria-labelledby` attributes are synchronized with conditional visual text changes so that all users receive the same contextual information.
## 2026-11-11 - Global Focus Indicators
**Learning:** Found that keyboard accessibility relies on focus indicators. A global `:focus-visible` approach helps keyboard users while staying invisible to mouse users.
**Action:** Implement global `:focus-visible` on interactive elements like buttons, inputs, selects, and links to ensure accessibility without visual regression for mouse users.
