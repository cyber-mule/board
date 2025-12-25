# Mock Data Configuration Guide

## Overview

The Zero Network Panel frontend now includes a comprehensive mock data system that allows you to run and develop the application without connecting to a backend service. This is particularly useful for:

- **Frontend Development**: Work on UI features without backend dependencies
- **Testing**: Test frontend functionality in isolation
- **Demonstrations**: Show the application to stakeholders without infrastructure setup
- **Local Development**: Quick iteration without backend setup complexity

## Quick Start

### 1. Enable Mock Mode

Create a `.env.local` file in the project root (or modify your existing one):

```bash
# Copy from example
cp .env.example .env.local

# Edit .env.local and set:
VITE_USE_MOCK=true
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the Application

Open your browser to `http://localhost:5173`

## Mock Users and Credentials

The mock system includes two pre-configured users:

### Regular User
- **Email**: `user@example.com`
- **Password**: `P@ssw0rd!`
- **Role**: User
- **Balance**: $1,000 (100,000 cents)

### Admin User
- **Email**: `admin@example.com`
- **Password**: `P@ssw0rd!`
- **Role**: Admin
- **Balance**: $0

## Available Mock Data

### Plans (3 active plans)
1. **Starter Plan** - $9.99/month, 50GB, 3 devices
2. **Professional Plan** - $29.99/month, 200GB, 10 devices
3. **Enterprise Plan** - $99.99/month, 1TB, 50 devices

### Subscriptions
- User has 1 active Professional Plan subscription
- 50GB used of 200GB limit
- 3 devices connected
- Expires in 20 days

### Orders (2 orders)
1. **ORD-2024-001** - Paid order for Professional Plan ($29.99)
2. **ORD-2024-002** - Pending payment order for Starter Plan ($9.99)

### Announcements (3 announcements)
1. **Welcome Message** - Pinned, published
2. **Maintenance Notice** - Published, expires soon
3. **New Features** - Draft status

### Nodes (4 nodes)
1. **US West - Los Angeles** - Online, 45% load
2. **US East - New York** - Online, 62% load
3. **EU - Frankfurt** - Online, 38% load
4. **Asia - Singapore** - Maintenance mode

### Subscription Templates (3 templates)
1. **Clash Premium** - YAML format, published, default
2. **V2Ray Standard** - JSON format, published
3. **Shadowsocks Basic** - JSON format, draft

### Security Settings
- Third-party API: Disabled by default
- API Key/Secret: Empty (can be generated in UI)
- Encryption: HMAC-SHA256
- Nonce TTL: 300 seconds

## Features Supported

### Authentication ✅
- Login with email and password
- User registration
- Token refresh
- Logout

### User Portal ✅
- View profile
- Browse plans
- View subscriptions
- View orders
- Check balance
- Read announcements
- View nodes

### Admin Panel ✅

#### Plans Management
- List all plans
- Create new plans
- Edit existing plans
- All form fields supported

#### Announcement Management
- List announcements
- Create announcements
- Edit draft announcements
- Publish announcements with expiration

#### Subscription Templates
- List templates
- Create templates
- Edit templates
- Publish templates with version control
- View version history (mock data)

#### Order Management
- List all orders
- View order details
- Mark orders as paid (with payment method selection)
- Cancel orders (with reason)

#### Security Settings
- View current settings
- Update API configuration
- Toggle third-party API access
- Modify encryption settings

#### Node Management
- List all nodes
- View node status and metrics

## Mock API Behavior

### Network Simulation
- **Delay**: 300ms artificial delay on all requests (simulates real network)
- **Response Format**: Matches actual API response structure
- **Error Handling**: Returns appropriate HTTP status codes

### Data Persistence
- **Session Lifetime**: Mock data persists during the browser session
- **Page Reload**: Data resets to initial state on page reload
- **No Backend**: All data stored in memory (browser JavaScript)

### Supported Operations

#### Read Operations
- ✅ All GET endpoints fully functional
- ✅ Pagination support (returns mock pagination data)
- ✅ Filtering (basic filtering supported)

#### Write Operations
- ✅ Create operations (POST)
- ✅ Update operations (PATCH/PUT)
- ✅ Publish operations (POST)
- ✅ Complex operations (pay, cancel, etc.)

### ID Generation
- Auto-incrementing IDs for new entities
- Order numbers: `ORD-2024-XXX` format
- Template versions: `vX` format (incremental)

## Extending Mock Data

### Adding New Mock Data

Edit `/src/mock/data.ts`:

```typescript
// Add a new plan
export const mockPlans: Plan[] = [
  // ... existing plans
  {
    id: 4,
    name: 'Custom Plan',
    // ... other fields
  },
];
```

### Adding New Endpoints

Edit `/src/mock/interceptor.ts`:

```typescript
// Add handler for new endpoint
if (matchPath(url, `${API_PREFIX}/your/endpoint`)) {
  if (method === 'GET') {
    return mockResponse({ data: yourMockData });
  }
}
```

## Development Workflow

### Typical Development Session

1. **Enable Mock Mode** in `.env.local`
2. **Start Development Server**: `npm run dev`
3. **Login** with mock credentials
4. **Develop UI Features** without backend concerns
5. **Test Functionality** with mock data
6. **Disable Mock Mode** when backend is ready

### Switching Between Mock and Real Backend

```bash
# In .env.local

# Use mock data
VITE_USE_MOCK=true

# Use real backend
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8888
```

After changing, restart the development server for changes to take effect.

## Testing Scenarios

### Test User Workflows

```bash
# Login as regular user
Email: user@example.com
Password: P@ssw0rd!

✓ View active subscription
✓ Browse available plans
✓ Check order history
✓ Read announcements
✓ View node status
```

### Test Admin Workflows

```bash
# Login as admin
Email: admin@example.com
Password: P@ssw0rd!

✓ Create new plan
✓ Edit existing plan
✓ Create announcement
✓ Publish announcement
✓ Create subscription template
✓ Publish template with version
✓ Mark order as paid
✓ Cancel order
✓ Update security settings
```

## Debugging Mock API

### Enable Console Logging

Mock API calls are automatically logged to the browser console:

```
[MOCK] GET /api/v1/plans
[MOCK] POST /api/v1/admin/plans { name: "New Plan", ... }
[MOCK] PATCH /api/v1/admin/plans/1 { price_cents: 1999 }
```

### Check Request/Response

Open browser DevTools → Network tab to see:
- Request URL
- Request headers
- Response status
- Response body

Note: Since mock data runs in-memory, you won't see actual network calls, but you can log the data.

## Limitations

### Current Limitations

1. **No Persistence**: Data resets on page reload
2. **No Real Files**: File uploads are not simulated
3. **Simple Pagination**: Returns all data with mock pagination metadata
4. **Basic Filtering**: Complex query parameters may not be fully supported
5. **No Validation**: Form validation happens on frontend only
6. **Simplified Search**: Text search is basic (not full-text)

### Not Implemented (Yet)

- Order refund endpoint (P2 priority)
- Node kernel sync operation
- Advanced statistics and analytics
- Real-time notifications
- File download endpoints

## Troubleshooting

### Mock Mode Not Working

**Problem**: Application still tries to connect to backend

**Solution**:
1. Check `.env.local` file exists in project root
2. Verify `VITE_USE_MOCK=true` is set
3. Restart development server (`npm run dev`)
4. Clear browser cache and reload

### Authentication Fails

**Problem**: Cannot login with mock credentials

**Solution**:
1. Ensure mock mode is enabled
2. Use exact credentials: `user@example.com` / `P@ssw0rd!`
3. Check browser console for errors
4. Try refreshing the page

### Data Not Updating

**Problem**: Changes to mock data don't appear

**Solution**:
1. Reload the page (data resets to initial state)
2. Check console for errors
3. Verify the endpoint is implemented in `interceptor.ts`

### TypeScript Errors

**Problem**: Type errors in mock files

**Solution**:
```bash
# Check TypeScript compilation
npm run build

# Or use vue-tsc
npx vue-tsc --noEmit
```

## Configuration Reference

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `VITE_USE_MOCK` | `true`/`false` | `false` | Enable/disable mock data mode |
| `VITE_API_BASE_URL` | URL string | `''` | Backend API base URL (ignored in mock mode) |
| `VITE_API_PREFIX` | Path string | `/api/v1` | API prefix for all endpoints |
| `VITE_ADMIN_PREFIX` | Path string | `admin` | Admin endpoint prefix |

### Mock Module Structure

```
src/mock/
├── index.ts          # Main export and configuration
├── data.ts           # Mock data definitions
└── interceptor.ts    # Request interceptor and handlers
```

## Best Practices

### Development Tips

1. **Start with Mock**: Begin UI development with mock data
2. **Test Edge Cases**: Use mock data to test error scenarios
3. **Match Real API**: Keep mock responses consistent with actual API
4. **Document Changes**: Update mock data when API changes
5. **Switch Often**: Regularly test with real backend to catch integration issues

### Mock Data Guidelines

1. **Realistic Data**: Use realistic values and formats
2. **Complete Objects**: Include all required fields
3. **Timestamps**: Use realistic timestamps
4. **Relationships**: Maintain data relationships (IDs, foreign keys)
5. **Status Variety**: Include different states (active, pending, cancelled, etc.)

## Next Steps

1. **Try Mock Mode**: Enable mock mode and explore the application
2. **Test Features**: Use mock data to test all implemented features
3. **Add Scenarios**: Create additional mock data for specific test scenarios
4. **Report Issues**: If you find mock data issues, report them or fix in `data.ts`
5. **Backend Integration**: When backend is ready, switch to real API

## Support

For questions or issues with mock data:
- Check console logs for error messages
- Review `MOCK-DATA-SETUP.md` (this file)
- Refer to API documentation in `frontend-guide.md`
- Check implementation in `src/mock/` directory

---

**Last Updated**: 2024-12-25  
**Mock API Version**: 1.0.0  
**Status**: ✅ Fully Functional  
**Coverage**: 13/13 admin write endpoints (100%)
