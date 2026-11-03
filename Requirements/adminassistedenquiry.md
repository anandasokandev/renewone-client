# Admin – Create Enquiry Page

## 1. Objective

Create a new **Create Enquiry** page accessible from the Admin side.

The page allows an administrator to select an agent, choose an insurance type, enter customer and vehicle details, and create an enquiry.

After successful creation, navigate to the **Document Upload** step. Document upload implementation is out of scope for this phase.

## 2. Form Workflow

### Step 1 – Select Agent

**API 5:**
`GET api/Account/agent-lookup`

- Display active agents in a searchable dropdown.
- Support searching by agent name, agency name, agent code, and mobile number.
- Handle the paginated response (`data.items`).
- After selecting an agent, display a compact information card containing:
  - Agent Name
  - Agent Code
  - Agency Name
  - Mobile Number
  - Agent Class
  - Commission Percentage
  - Wallet Balance

Use `accountId` as the selected agent value.

### Step 2 – Select Insurance Type

**API 1:**
`GET api/insurance-types`

- Load active insurance types.
- Display them in a searchable dropdown.
- Use `id` as the value and `name` as the label.

**Conditional behaviour:**
- If `Vehicle Insurance` is selected, display the Vehicle Type dropdown.
- For other insurance types, hide vehicle-specific fields.
- Health Insurance creation is not part of this implementation unless a separate API contract is provided.

### Step 3 – Select Vehicle Type

**API 2:**
`GET api/vehicle-types`

- Call when Vehicle Insurance is selected.
- Display active vehicle types in a searchable dropdown.
- Use `id` as the value and `typeName` as the label.
- Reset vehicle type when insurance type changes.

### Step 4 – Customer & Vehicle Details

Display this section after selecting Vehicle Insurance and Vehicle Type.

Fields:

| Field | Type | Required |
|---|---|---|
| Customer Name | Text input | Yes |
| Contact Number | Phone input | Yes |
| RC Number | Text input | Yes |
| Policy Type | Selection tabs | Yes |

**Policy Type tabs:**
- Comprehensive
- Third Party
- Own Damage

**Quick Selection Options:**

1. **Ownership Changed**
   - Yes
   - No
   - Default: No

2. **Previous Claim**
   - Yes
   - No
   - Default: No

3. **NCB Percentage**
   - Show only when Previous Claim = No.
   - Display selectable percentage tabs.
   - Default: 20%.
   - Suggested options: 0%, 20%, 25%, 35%, 45%, 50%.
   - Hide and clear NCB when Previous Claim = Yes.

### Step 5 – Proceed

Display a primary **Proceed** button at the bottom.

On clicking:
1. Validate all required fields.
2. Prevent duplicate submissions.
3. Construct the request payload.
4. Call API 6.
5. On successful response, retain the returned enquiry details and navigate to the Document Upload step.
6. Display appropriate API error messages on failure.

---

## 3. API Integration

### API 1 – Insurance Types

`GET /api/insurance-types`

Use `data[]` to populate the insurance type dropdown.

### API 2 – Vehicle Types

`GET /api/vehicle-types`

Use `data[]` to populate the vehicle type dropdown.

### API 3 – Insurance Companies

`GET /api/InsuranceCompany`

Available for future use. Do not integrate into this vehicle enquiry form unless required by the existing business flow.

### API 4 – Vendors

`GET /api/Vendor`

Available for future use. Do not integrate into this form.

### API 5 – Agent Lookup

`GET /api/Account/agent-lookup`

Use `data.items` to populate the agent dropdown.

Respect the existing pagination and search conventions.

### API 6 – Create Vehicle Enquiry

`POST /api/VehicleEnquiry/create-vehicle-enquiry`

**Request Payload:**

```json
{
  "accountId": "selected-agent-account-id",
  "insuranceTypeId": "selected-insurance-type-id",
  "vehicleTypeId": "selected-vehicle-type-id",
  "customerName": "Anand Asokan",
  "customerNumber": "9845565575",
  "vehicleNumber": "KL38K0014",
  "miPolicyType": "Comprehensive",
  "isRCOwnerChanged": false,
  "hasPreviousClaim": false,
  "ncbPercentage": 20,
  "priority": 1,
  "submissionMode": 1,
  "AccountId": "selected-agent-account-id"
}
```

**Important payload mappings:**

| UI Field | API Property |
|---|---|
| Selected Agent | `accountId` |
| Insurance Type | `insuranceTypeId` |
| Vehicle Type | `vehicleTypeId` |
| Customer Name | `customerName` |
| Contact Number | `customerNumber` |
| RC Number | `vehicleNumber` |
| Policy Type | `miPolicyType` |
| Ownership Changed | `isRCOwnerChanged` |
| Previous Claim | `hasPreviousClaim` |
| NCB | `ncbPercentage` |

- Both `accountId` and `AccountId` must be populated with the selected agent's account ID, as shown in the API contract.
- Use boolean values for ownership and previous claim.
- When Previous Claim = Yes, omit NCB or send `null` according to backend requirements.
- Keep `priority` and `submissionMode` as the existing API-defined values.

---

## 4. UI/UX Requirements

- Follow the existing Admin panel design system.
- Use a clean, structured, responsive form layout.
- Every dropdown across this page must support searching.
- Display selected agent information in a compact card.
- Use selection tabs for policy type, ownership change, previous claim, and NCB.
- Clearly distinguish required fields.
- Provide loading, empty, validation, success, and error states.
- Disable Proceed while submitting.
- Reset dependent fields when their parent selection changes.

## 5. Navigation – Future Document Upload

After API 6 returns success:

- Store the returned `enquiryId` and `enquiryNumber`.
- Preserve the returned enquiry information for the next step.
- Navigate to the Document Upload step.
- Do not implement document upload APIs or UI in this phase.
- Keep the page structure ready for a multi-step enquiry creation workflow.

## 6. Implementation Constraints

- Follow existing Angular component and service architecture.
- Reuse existing form controls and shared components.
- Do not introduce unnecessary dependencies.
- Do not hardcode dropdown data.
- Do not modify unrelated enquiry workflows.
- Ensure the implementation works with the existing backend response structure.

## 7. Acceptance Criteria

- [ ] Agent dropdown loads active agents and supports searching.
- [ ] Selected agent information is displayed.
- [ ] Insurance type dropdown loads dynamically.
- [ ] Vehicle type appears only for Vehicle Insurance.
- [ ] All dropdowns support searching.
- [ ] Customer and vehicle fields validate correctly.
- [ ] Policy type selection works.
- [ ] Ownership and previous claim tabs work.
- [ ] NCB appears only when Previous Claim = No.
- [ ] Proceed sends the correct API payload.
- [ ] Successful creation retains enquiry details.
- [ ] Navigation to Document Upload works without implementing upload functionality.