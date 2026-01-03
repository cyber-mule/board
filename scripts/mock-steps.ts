process.env.VITE_USE_MOCK = 'true';
process.env.VITE_API_PREFIX = '/api/v1';
process.env.VITE_ADMIN_PREFIX = 'admin';

type MockFetch = (url: string, options?: RequestInit) => Promise<Response>;

type RequestResult = {
  status: number;
  data: unknown;
};

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request(
  fetcher: MockFetch,
  method: RequestMethod,
  path: string,
  payload?: unknown,
): Promise<RequestResult> {
  const response = await fetcher(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  return {
    status: response.status,
    data: await parseResponse(response),
  };
}

async function run() {
  const { mockFetch } = await import('../src/mock/interceptor');
  const apiPrefix = process.env.VITE_API_PREFIX ?? '/api/v1';
  const adminPrefix = process.env.VITE_ADMIN_PREFIX ?? 'admin';

  console.log('Step 1: admin login');
  const login = await request(mockFetch, 'POST', `${apiPrefix}/auth/login`, {
    email: 'admin@demo.com',
    password: 'P@ssw0rd!',
  });
  console.log(JSON.stringify(login, null, 2));

  console.log('\nStep 2: create node');
  const createdNode = await request(mockFetch, 'POST', `${apiPrefix}/${adminPrefix}/nodes`, {
    name: 'hk-01',
    region: 'HK',
    status: 'active',
  });
  console.log(JSON.stringify(createdNode, null, 2));

  const nodeData = (createdNode.data as { node?: { id?: number } } | null)?.node;
  const nodeId = nodeData?.id;
  if (!nodeId) {
    throw new Error('Node id missing in create response');
  }

  console.log('\nStep 3: sync node kernels');
  const sync = await request(
    mockFetch,
    'POST',
    `${apiPrefix}/${adminPrefix}/nodes/${nodeId}/kernels/sync`,
    { protocol: 'http' },
  );
  console.log(JSON.stringify(sync, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
