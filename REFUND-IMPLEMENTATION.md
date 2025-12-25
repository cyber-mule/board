# Order Refund Implementation

## Overview

Implemented the complete order refund functionality for the Zero Network Panel admin interface. This feature allows administrators to process full or partial refunds for paid orders.

## Implementation Date

2024-12-25

## API Layer Implementation

### Types Added (src/api/types.ts)

```typescript
export type RefundOrderRequest = {
  amount_cents: number;      // Required: Refund amount in cents
  reason?: string;           // Optional: Reason for the refund
  operator?: string;         // Optional: Name/ID of operator processing refund
};

export type RefundOrderResponse = {
  order: AdminOrderDetail;   // Updated order with refund information
  refund: OrderRefund;       // The created refund record
};
```

**OrderRefund** type (already existed):
```typescript
export type OrderRefund = {
  id: number;
  order_id: number;
  amount_cents: number;
  reason?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
};
```

### API Function Added (src/api/admin/index.ts)

```typescript
export function refundAdminOrder(id: number, payload: RefundOrderRequest) {
  return requestJson<RefundOrderResponse>(adminPath(`/orders/${id}/refund`), {
    method: 'POST',
    json: payload,
  });
}
```

**API Endpoint**: `POST /api/v1/{adminPrefix}/orders/{id}/refund`

## UI Implementation

### Component: AdminOrdersPage.vue

#### New State Variables

```typescript
const showRefundModal = ref(false);

const refundForm = reactive<RefundOrderRequest>({
  amount_cents: 0,
  reason: '',
  operator: '',
});
```

#### New Functions

1. **canRefund(order)**: Permission check
   - Returns `true` if order status is 'paid'
   - Returns `true` if order has remaining refundable amount
   - Prevents refunding fully refunded orders

2. **openRefundModal(order)**: Opens refund modal
   - Sets selected order
   - Calculates maximum refundable amount
   - Pre-fills amount with max refundable
   - Resets form fields

3. **closeRefundModal()**: Closes modal and resets form

4. **handleRefund()**: Processes the refund
   - Validates refund amount > 0
   - Validates amount doesn't exceed max refundable
   - Calls API
   - Updates order list and selected order
   - Handles errors with user-friendly messages

#### UI Components Added

**Refund Button** (in order list):
- Shown only for orders that can be refunded
- Orange warning color to indicate caution
- Triggers refund modal

**Refund Modal**:
- Order information display (number, total, already refunded amount)
- Amount input field (with validation)
- Maximum refundable amount display
- Reason textarea (optional)
- Operator name input (optional)
- Cancel and Process buttons
- Disabled state while processing

#### Validation Rules

- **Amount**: Must be > 0
- **Amount**: Cannot exceed (total_cents - refunded_cents)
- **Amount**: Required field (cannot submit empty)
- Real-time validation with error messages

## Mock Data Implementation

### Interceptor Handler (src/mock/interceptor.ts)

Added comprehensive refund endpoint handler:

```typescript
if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/refund`)) {
  const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/refund`);
  
  if (method === 'POST') {
    // Extract order
    // Validate refund amount
    // Create refund record
    // Update order status (partially_refunded or refunded)
    // Update refunded_cents total
    // Add refund to order.refunds array
    // Return updated order + refund
  }
}
```

**Features**:
- Validates refund amount (> 0 and <= max refundable)
- Generates unique refund reference: `REF-{timestamp}`
- Tracks operator in refund metadata
- Updates order status:
  - Keeps current status if partially refunded
  - Changes to 'refunded' if fully refunded
- Maintains refund history in `order.refunds` array
- Calculates and updates `order.refunded_cents`
- Sets `order.refunded_at` when fully refunded

## Features

### Full & Partial Refunds
- ✅ Support for partial refunds (multiple refunds per order)
- ✅ Automatic status management (partially_refunded → refunded)
- ✅ Refund amount tracking and validation
- ✅ Maximum refundable amount calculation

### Refund Records
- ✅ Each refund creates a separate record
- ✅ Unique reference number generation
- ✅ Operator tracking
- ✅ Reason logging
- ✅ Timestamp recording

### User Experience
- ✅ Pre-filled maximum refundable amount
- ✅ Real-time validation
- ✅ Clear error messages
- ✅ Already refunded amount display
- ✅ Confirmation before processing
- ✅ Loading states during processing

### Security & Validation
- ✅ Amount validation (> 0)
- ✅ Maximum amount validation
- ✅ Status-based permission checks
- ✅ Operator audit trail

## User Workflow

1. **Navigate to Orders**: Admin visits `/admin/orders`
2. **Identify Order**: Find paid order eligible for refund
3. **Click Refund**: Orange "Refund" button appears for eligible orders
4. **Enter Details**:
   - Amount automatically pre-filled with max refundable
   - Optionally adjust amount for partial refund
   - Optionally add reason
   - Optionally add operator name
5. **Process**: Click "Process Refund"
6. **Confirmation**: Order updated immediately with new refund record

## Edge Cases Handled

- **Multiple Refunds**: System tracks cumulative refunded amount
- **Full vs Partial**: Automatically determines order status
- **Over-refund Prevention**: Validates against remaining refundable amount
- **Already Refunded**: Button hidden for fully refunded orders
- **Cancelled Orders**: Cannot refund cancelled orders (validation in canRefund)
- **Zero Amount**: Validates amount > 0

## Testing Checklist

### Functional Tests
- [ ] Refund button appears only for paid orders
- [ ] Refund button hidden for fully refunded orders
- [ ] Refund button hidden for cancelled orders
- [ ] Modal opens with correct order information
- [ ] Amount pre-filled with max refundable
- [ ] Amount validation prevents > max refundable
- [ ] Amount validation prevents <= 0
- [ ] Partial refund creates correct status
- [ ] Full refund changes status to 'refunded'
- [ ] Order list updates after refund
- [ ] Order details update after refund
- [ ] Error messages display correctly

### UI Tests
- [ ] Modal displays order number and total
- [ ] Already refunded amount shown when applicable
- [ ] Maximum refundable amount displayed
- [ ] Loading state during processing
- [ ] Success feedback after refund
- [ ] Error feedback on failure
- [ ] Modal closes after successful refund

### Mock Data Tests
- [ ] POST /admin/orders/{id}/refund returns correct response
- [ ] Refund record added to order.refunds array
- [ ] order.refunded_cents updated correctly
- [ ] order.status updated appropriately
- [ ] Multiple refunds accumulate correctly
- [ ] Validation errors returned for invalid amounts

## Integration with Backend

When backend is connected, the implementation will:

1. Send POST request to `/api/v1/{adminPrefix}/orders/{id}/refund`
2. Include request body:
   ```json
   {
     "amount_cents": 1000,
     "reason": "Customer request",
     "operator": "admin@example.com"
   }
   ```
3. Receive response:
   ```json
   {
     "order": { /* Updated AdminOrderDetail */ },
     "refund": { /* OrderRefund record */ }
   }
   ```
4. Update UI with new order data
5. Show success message

## API Reference

### Backend Requirements

**Endpoint**: `POST /api/v1/{adminPrefix}/orders/{id}/refund`

**Request Body**:
```typescript
{
  amount_cents: number;  // Required, > 0
  reason?: string;       // Optional
  operator?: string;     // Optional
}
```

**Response** (200 OK):
```typescript
{
  order: AdminOrderDetail;  // Updated order object
  refund: OrderRefund;      // Created refund record
}
```

**Error Responses**:
- 400 Bad Request: Invalid refund amount
- 404 Not Found: Order not found
- 422 Unprocessable Entity: Refund exceeds refundable amount

## Files Changed

### Modified Files (3)
1. `src/api/types.ts`
   - Added RefundOrderRequest type
   - Added RefundOrderResponse type

2. `src/api/admin/index.ts`
   - Added refundAdminOrder function
   - Added RefundOrderResponse import

3. `src/modules/admin/pages/AdminOrdersPage.vue`
   - Added refund modal state
   - Added refund form state
   - Added canRefund function
   - Added openRefundModal function
   - Added closeRefundModal function
   - Added handleRefund function
   - Added refund button in order list
   - Added refund modal UI
   - Added warning button styling

4. `src/mock/interceptor.ts`
   - Added refund endpoint handler
   - Added validation logic
   - Added refund record creation
   - Added status update logic

## Statistics

- **Lines Added**: ~150 lines
- **New Functions**: 4
- **New UI Components**: 1 modal
- **New API Endpoints Mocked**: 1
- **New Types**: 2

## Completion Status

✅ **COMPLETE** - Order refund functionality fully implemented

- ✅ Type definitions
- ✅ API function
- ✅ UI component (button)
- ✅ UI component (modal)
- ✅ Form validation
- ✅ Permission checks
- ✅ Mock data handler
- ✅ Error handling
- ✅ Loading states
- ✅ Documentation

## Next Steps

1. **Testing**: Manual testing with mock data
2. **Backend Integration**: Test with real backend
3. **User Acceptance**: Get feedback from admin users
4. **Monitoring**: Track refund patterns and reasons

## Priority Classification

**P2 - Medium Priority** (as per ADMIN-CRUD-STATUS.md)

This feature is important for customer service operations but less urgent than core CRUD operations that were completed first.

## Related Documentation

- [ADMIN-CRUD-STATUS.md](./ADMIN-CRUD-STATUS.md) - Overview of all admin write operations
- [P1-FEATURES-IMPLEMENTATION.md](./P1-FEATURES-IMPLEMENTATION.md) - Security settings and order operations
- [frontend-guide.md](./frontend-guide.md) - API reference and integration guide
- [MOCK-DATA-SETUP.md](./MOCK-DATA-SETUP.md) - Mock data system documentation
