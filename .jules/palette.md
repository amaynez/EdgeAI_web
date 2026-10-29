## 2024-06-25 - Accessibility Check
**Learning:** The `AuditLeadForm` component currently lacks `required` attributes and visual required indicators on its text inputs (name, email, company, role). Additionally, an aria-required attribute or required marker on the labels is missing to guide screen readers.
**Action:** Add required attributes to inputs and required indicators (*) to labels for accessibility.

## 2024-11-20 - Modal Keyboard Accessibility
**Learning:** The `AuditLeadForm` modal lacked support for closing via the Escape key and didn't properly manage keyboard focus between its multi-step content, which is a key accessibility requirement for modal dialogues.
**Action:** Implemented an Escape key listener via `useEffect` to close the modal and added `autoFocus` to the first input of each step so that screen readers and keyboard users can seamlessly navigate form changes.
