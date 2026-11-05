## 2024-06-25 - Accessibility Check
**Learning:** The `AuditLeadForm` component currently lacks `required` attributes and visual required indicators on its text inputs (name, email, company, role). Additionally, an aria-required attribute or required marker on the labels is missing to guide screen readers.
**Action:** Add required attributes to inputs and required indicators (*) to labels for accessibility.
## $(date +%Y-%m-%d) - Add Tooltips to Disabled Elements and Hide Decorative SVGs
**Learning:** In the LeadsTable, the "Copy" button becomes disabled dynamically when a draft email isn't available, but provided no visual explanation. Also, multiple inline SVGs lacked ARIA attributes, causing unnecessary screen reader verbosity.
**Action:** When conditionally disabling buttons, ensure a dynamic `title` tooltip is provided to explain *why* it is disabled. For inline SVG icons paired with visible text (e.g., inside buttons or data toggles), add `aria-hidden="true"` to prevent screen readers from announcing them redundantly.
