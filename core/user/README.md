# @inventory-platform/user

**Status:** Migrated

Identity, shops, CRM contacts, team collaboration, and public/auth **journeys** (login, signup, onboarding).

## Owns

### Dashboard

- Customers, vendors, shops, profile
- Invitations, my-invitations, join-requests, shop-users, access-control
- WhatsApp marketing
- Nav groups: Overview, Contact, Team & Collaboration, Marketing

### Journeys (pre-dashboard)

- Auth forms (login, signup, forgot/reset password)
- Shop selection, onboarding registration, request-join, requests/invitations

## Does not own

- Accounting party ledgers (`core/accounting`)
- Session stores (`platform/session`) — user pages consume them
- Marketing header chrome primitives (`ui-kit` + `journeyChrome`)

## Layout

`api/` · `queries/` · `pages/` · `ui/` · `journey/` · `routes.ts` · `nav.ts`

Public subpaths may include `./shops`, `./customers`, `./vendors`, etc. (see `package.json` exports).

## UI chrome

Auth / onboarding: `journeyChrome` from ui-kit. Profile and lists: `surfaceChrome` / standard list patterns.

## Related

- `@inventory-platform/session` — auth + shop
- `@inventory-platform/shell` — dashboard chrome after login
- `@inventory-platform/schema` — onboarding vertical fields

### Vendor form: GSTIN first

`VendorEditForm` starts with the GSTIN. As soon as 15 valid characters are typed (offline check in `model/gstin.ts`, same algorithm as the backend) it calls `GET /taxation/gstin/{gstin}` through `useGstinLookupQuery`, shows the registration status, and fills the empty fields (company name, address, city, state, pincode) from the record — never overwriting what was typed; "Use these details" does. The State dropdown (`model/gst-states.ts`) is locked to the GSTIN's state; without a GSTIN it is required, because the backend needs a valid GSTIN or `postalAddress.stateCode` to decide IGST vs CGST/SGST (`vendorIsPlaceable`).

### Access control: "Edit rate rules and rates"

Each member's module toggles include `rateRulesEdit` ("Edit rate rules and rates"), next to the other module grants. The Access control page shows it as a toggle; it lets that member edit the shop's rate rules and change a rule rate's discount % or scheme (the server enforces it). `lib/memberModules.ts` (`modulesFromMember`) builds the toggle state from a member: the stored grant where one is set, otherwise the effective access the server reports. Add any new module permission there as well as to the toggle list.
