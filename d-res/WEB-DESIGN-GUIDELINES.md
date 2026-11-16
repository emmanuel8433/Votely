# Web Design Guidelines

Apply these rules when building or reviewing websites and web applications.

## 1. Layout and hierarchy
- Make the page's purpose and primary action immediately clear.
- Group related content logically.
- Use whitespace before adding unnecessary borders or cards.
- Keep spacing, alignment and component placement consistent.
- Make content easy to scan.

## 2. Color and typography
- Use a coherent, limited color palette.
- Define reusable CSS variables for colors, spacing and other design tokens.
- Maintain readable typography and a clear heading hierarchy.
- Aim for WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text.
- Never communicate important status through color alone.

## 3. Responsive design
- Support mobile, tablet and desktop layouts.
- Use flexible layouts and content-driven breakpoints.
- Prevent accidental horizontal overflow.
- Ensure forms, navigation, tables and buttons remain usable on small screens.
- Test long text and different content lengths.

## 4. Accessibility
- Prefer semantic HTML elements.
- Give inputs and interactive controls accessible labels.
- Ensure keyboard navigation and visible focus indicators.
- Provide meaningful alternative text for informative images.
- Respect reduced-motion preferences.
- Do not rely on hover alone to expose essential information.

## 5. Interaction and states
- Provide loading, empty, error, success and disabled states where appropriate.
- Validate form input and explain how to correct errors.
- Give clear feedback after important user actions.
- Confirm destructive actions when appropriate.
- Keep button labels specific and understandable.

## 6. Code quality
- Reuse existing project components and design tokens.
- Avoid unnecessary dependencies and duplicated CSS.
- Keep HTML semantic and CSS maintainable.
- Preserve existing functionality when improving appearance.
- Do not claim that an interaction works unless it has been implemented and tested.

## 7. Final review
Check visual hierarchy, spacing, contrast, accessibility, mobile responsiveness and functionality before finishing. Report anything that could not be tested.