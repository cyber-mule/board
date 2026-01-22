<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  CreateProtocolBindingRequest,
  CreateProtocolEntryRequest,
  PaginationMeta,
  ProtocolBindingSummary,
  ProtocolEntrySummary,
  UpdateProtocolBindingRequest,
  UpdateProtocolEntryRequest,
} from '../../../api/types';

type ProtocolTab = 'bindings' | 'entries';

type ProtocolTemplateKind = 'binding' | 'entry';

type ProtocolTemplate = {
  id: string;
  name: string;
  kind: ProtocolTemplateKind;
  protocol?: string;
  role?: string;
  kernel_id?: string;
  listen?: string;
  connect?: string;
  access_port?: number;
  status?: number;
  tags?: string[];
  description?: string;
  profile?: Record<string, unknown>;
  entry_port?: number;
};

type ProtocolTemplateStore = {
  binding: ProtocolTemplate[];
  entry: ProtocolTemplate[];
};

const TEMPLATE_STORAGE_KEY = 'znp_protocol_templates_v1';

const DEFAULT_BINDING_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'binding-vless-default',
    name: 'VLESS Listener',
    kind: 'binding',
    protocol: 'vless',
    role: 'listener',
    kernel_id: 'vless-default',
    listen: '0.0.0.0:443',
    access_port: 443,
    status: 1,
    tags: ['edge'],
    description: 'Default VLESS listener',
    profile: { security: 'none' },
  },
  {
    id: 'binding-ss-default',
    name: 'Shadowsocks AEAD Listener',
    kind: 'binding',
    protocol: 'ss',
    role: 'listener',
    kernel_id: 'ss-default',
    listen: '0.0.0.0:8388',
    access_port: 8388,
    status: 1,
    tags: ['edge'],
    description: 'SS AEAD listener',
    profile: {
      server: {
        method: 'aes-128-gcm',
        password: 'secret',
      },
    },
  },
  {
    id: 'binding-ss-2022',
    name: 'Shadowsocks 2022 Listener',
    kind: 'binding',
    protocol: 'ss',
    role: 'listener',
    kernel_id: 'ss-2022',
    listen: '0.0.0.0:8388',
    access_port: 8388,
    status: 1,
    tags: ['edge'],
    description: 'SS2022 listener',
    profile: {
      server: {
        method: '2022-blake3-aes-128-gcm',
        password: 'base64-psk',
      },
    },
  },
  {
    id: 'binding-ss-connector',
    name: 'Shadowsocks Connector',
    kind: 'binding',
    protocol: 'ss',
    role: 'connector',
    kernel_id: 'ss-out',
    connect: '1.1.1.1:443',
    status: 1,
    tags: ['outbound'],
    description: 'SS outbound connector',
    profile: {
      client: {
        method: 'aes-128-gcm',
        password: 'secret',
        endpoints: [{ address: 'ss.example.com', port: 8388 }],
      },
    },
  },
];

const DEFAULT_ENTRY_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'entry-vless-default',
    name: 'VLESS Public Entry',
    kind: 'entry',
    protocol: 'vless',
    entry_port: 443,
    status: 1,
    tags: ['public'],
    description: 'Default VLESS entry',
    profile: {},
  },
  {
    id: 'entry-ss-default',
    name: 'SS Public Entry',
    kind: 'entry',
    protocol: 'ss',
    entry_port: 443,
    status: 1,
    tags: ['public'],
    description: 'Default SS entry',
    profile: {},
  },
];

const activeTab = ref<ProtocolTab>('bindings');

const bindings = ref<ProtocolBindingSummary[]>([]);
const bindingsLoading = ref(true);
const bindingsLoadingMore = ref(false);
const bindingsError = ref('');
const bindingsPage = ref(1);
const bindingsPagination = ref<PaginationMeta | null>(null);
const selectedBindingIds = ref<number[]>([]);
const batchNodeIds = ref('');
const batchSyncing = ref(false);

const entries = ref<ProtocolEntrySummary[]>([]);
const entriesLoading = ref(true);
const entriesLoadingMore = ref(false);
const entriesError = ref('');
const entriesPage = ref(1);
const entriesPagination = ref<PaginationMeta | null>(null);

const actionMessage = ref('');
const actionError = ref('');
const isSaving = ref(false);
const syncingBinding = ref(false);

const bindingFilters = reactive({
  q: '',
  protocol: '__all__',
  status: '__all__' as number | string,
  node_id: '',
});

const entryFilters = reactive({
  q: '',
  protocol: '__all__',
  status: '__all__' as number | string,
  binding_id: '',
});

const showCreateBindingModal = ref(false);
const showEditBindingModal = ref(false);
const showDeleteBindingModal = ref(false);

const showCreateEntryModal = ref(false);
const showEditEntryModal = ref(false);
const showDeleteEntryModal = ref(false);

const selectedBinding = ref<ProtocolBindingSummary | null>(null);
const selectedEntry = ref<ProtocolEntrySummary | null>(null);

const createBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol: string;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: number;
  kernel_id: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  node_id: null,
  protocol: '',
  role: 'listener',
  listen: '',
  connect: '',
  access_port: null,
  status: 1,
  kernel_id: '',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const editBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol: string;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: number;
  kernel_id: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  node_id: null,
  protocol: '',
  role: 'listener',
  listen: '',
  connect: '',
  access_port: null,
  status: 1,
  kernel_id: '',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const createEntryForm = reactive<{
  name: string;
  binding_id: number | null;
  entry_address: string;
  entry_port: number | null;
  protocol: string;
  status: number;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  binding_id: null,
  entry_address: '',
  entry_port: null,
  protocol: '',
  status: 1,
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const editEntryForm = reactive<{
  name: string;
  binding_id: number | null;
  entry_address: string;
  entry_port: number | null;
  protocol: string;
  status: number;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  binding_id: null,
  entry_address: '',
  entry_port: null,
  protocol: '',
  status: 1,
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const bindingTemplateName = ref('');
const entryTemplateName = ref('');
const selectedBindingTemplateId = ref('');
const selectedEntryTemplateId = ref('');
const customTemplates = ref(loadCustomTemplates());
const bindingTemplates = computed(() => [
  ...DEFAULT_BINDING_TEMPLATES,
  ...customTemplates.value.binding,
]);
const entryTemplates = computed(() => [
  ...DEFAULT_ENTRY_TEMPLATES,
  ...customTemplates.value.entry,
]);

const hasNextBindings = computed(() => bindingsPagination.value?.has_next ?? false);
const hasNextEntries = computed(() => entriesPagination.value?.has_next ?? false);
const visibleBindingIds = computed(() => bindings.value.map((binding) => binding.id));
const selectedBindingCount = computed(() => selectedBindingIds.value.length);
const bindingSelectionState = computed<boolean | 'indeterminate'>(() => {
  if (!visibleBindingIds.value.length) {
    return false;
  }
  const selectedInView = visibleBindingIds.value.filter((id) =>
    selectedBindingIds.value.includes(id),
  );
  if (!selectedInView.length) {
    return false;
  }
  if (selectedInView.length === visibleBindingIds.value.length) {
    return true;
  }
  return 'indeterminate';
});

function bindingStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'default';
    case 2:
      return 'destructive';
    default:
      return 'outline';
  }
}

function bindingStatusLabel(value?: number): string {
  switch (value) {
    case 1:
      return '启用';
    case 2:
      return '停用';
    default:
      return '未知';
  }
}

function syncStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'secondary';
    case 2:
      return 'default';
    case 3:
      return 'destructive';
    default:
      return 'outline';
  }
}

function syncStatusLabel(value?: number): string {
  switch (value) {
    case 1:
      return '待同步';
    case 2:
      return '已同步';
    case 3:
      return '同步失败';
    default:
      return '-';
  }
}

function healthStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'default';
    case 2:
      return 'secondary';
    case 3:
    case 4:
      return 'destructive';
    default:
      return 'outline';
  }
}

function healthStatusLabel(value?: number): string {
  switch (value) {
    case 1:
      return '健康';
    case 2:
      return '退化';
    case 3:
      return '异常';
    case 4:
      return '离线';
    default:
      return '-';
  }
}

function entryStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  return bindingStatusVariant(value);
}

function entryStatusLabel(value?: number): string {
  return bindingStatusLabel(value);
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyTags(tags?: string[]): string {
  return (tags || []).join(', ');
}

function parseProfileRequired(value: string): Record<string, unknown> {
  if (!value.trim()) {
    actionError.value = 'Profile JSON 不能为空。';
    throw new Error('Missing profile');
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    actionError.value = 'Profile JSON 格式不正确。';
    throw error;
  }
}

function parseProfileOptional(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    actionError.value = 'Profile JSON 格式不正确。';
    throw error;
  }
}

function formatProfile(value?: Record<string, unknown>): string {
  if (!value || Object.keys(value).length === 0) {
    return '{\n  \n}';
  }
  return JSON.stringify(value, null, 2);
}

function createTemplateId(kind: ProtocolTemplateKind): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeTemplateStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed === 'active') {
      return 1;
    }
    if (trimmed === 'disabled') {
      return 2;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeTemplateList(items: unknown, kind: ProtocolTemplateKind): ProtocolTemplate[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id.trim() : '';
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      if (!id || !name) {
        return null;
      }
      const tags = Array.isArray(record.tags)
        ? record.tags.filter((tag) => typeof tag === 'string' && tag.trim())
        : undefined;
      const profile =
        record.profile && typeof record.profile === 'object' && !Array.isArray(record.profile)
          ? (record.profile as Record<string, unknown>)
          : undefined;
      const accessPort =
        typeof record.access_port === 'number' && Number.isFinite(record.access_port)
          ? record.access_port
          : undefined;
      const entryPort =
        typeof record.entry_port === 'number' && Number.isFinite(record.entry_port)
          ? record.entry_port
          : undefined;
      const template: ProtocolTemplate = {
        id,
        name,
        kind,
        protocol:
          typeof record.protocol === 'string' && record.protocol.trim()
            ? record.protocol.trim()
            : undefined,
        role:
          typeof record.role === 'string' && record.role.trim() ? record.role.trim() : undefined,
        kernel_id:
          typeof record.kernel_id === 'string' && record.kernel_id.trim()
            ? record.kernel_id.trim()
            : undefined,
        listen:
          typeof record.listen === 'string' && record.listen.trim()
            ? record.listen.trim()
            : undefined,
        connect:
          typeof record.connect === 'string' && record.connect.trim()
            ? record.connect.trim()
            : undefined,
        access_port: accessPort,
        entry_port: entryPort,
        status: normalizeTemplateStatus(record.status),
        tags,
        description:
          typeof record.description === 'string' && record.description.trim()
            ? record.description.trim()
            : undefined,
        profile,
      };
      return template;
    })
    .filter((template): template is ProtocolTemplate => Boolean(template));
}

function loadCustomTemplates(): ProtocolTemplateStore {
  if (typeof window === 'undefined') {
    return { binding: [], entry: [] };
  }
  const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (!raw) {
    return { binding: [], entry: [] };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ProtocolTemplateStore>;
    return {
      binding: normalizeTemplateList(parsed.binding, 'binding'),
      entry: normalizeTemplateList(parsed.entry, 'entry'),
    };
  } catch (error) {
    return { binding: [], entry: [] };
  }
}

function saveCustomTemplates(store: ProtocolTemplateStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(store));
}

function applyTemplateToBinding(template: ProtocolTemplate) {
  if (template.protocol) {
    createBindingForm.protocol = template.protocol;
  }
  if (template.role) {
    createBindingForm.role = template.role;
  }
  if (template.kernel_id) {
    createBindingForm.kernel_id = template.kernel_id;
  }
  if (template.listen !== undefined) {
    createBindingForm.listen = template.listen;
  }
  if (template.connect !== undefined) {
    createBindingForm.connect = template.connect;
  }
  if (template.access_port !== undefined) {
    createBindingForm.access_port = template.access_port;
  }
  if (template.status) {
    createBindingForm.status = template.status;
  }
  if (template.tags) {
    createBindingForm.tags = stringifyTags(template.tags);
  }
  if (template.description !== undefined) {
    createBindingForm.description = template.description;
  }
  if (template.profile !== undefined) {
    createBindingForm.profile = formatProfile(template.profile);
  }
}

function applyTemplateToEntry(template: ProtocolTemplate) {
  if (template.protocol) {
    createEntryForm.protocol = template.protocol;
  }
  if (template.entry_port !== undefined) {
    createEntryForm.entry_port = template.entry_port;
  }
  if (template.status) {
    createEntryForm.status = template.status;
  }
  if (template.tags) {
    createEntryForm.tags = stringifyTags(template.tags);
  }
  if (template.description !== undefined) {
    createEntryForm.description = template.description;
  }
  if (template.profile !== undefined) {
    createEntryForm.profile = formatProfile(template.profile);
  }
}

function handleApplyBindingTemplate() {
  actionMessage.value = '';
  actionError.value = '';
  if (!selectedBindingTemplateId.value) {
    actionError.value = '请选择模板。';
    return;
  }
  const template = bindingTemplates.value.find(
    (item) => item.id === selectedBindingTemplateId.value,
  );
  if (!template) {
    actionError.value = '模板不存在。';
    return;
  }
  applyTemplateToBinding(template);
  actionMessage.value = `已应用模板 ${template.name}。`;
}

function handleApplyEntryTemplate() {
  actionMessage.value = '';
  actionError.value = '';
  if (!selectedEntryTemplateId.value) {
    actionError.value = '请选择模板。';
    return;
  }
  const template = entryTemplates.value.find((item) => item.id === selectedEntryTemplateId.value);
  if (!template) {
    actionError.value = '模板不存在。';
    return;
  }
  applyTemplateToEntry(template);
  actionMessage.value = `已应用模板 ${template.name}。`;
}

function handleSaveBindingTemplate() {
  actionMessage.value = '';
  actionError.value = '';
  const protocol = createBindingForm.protocol.trim();
  const name = bindingTemplateName.value.trim() || createBindingForm.name.trim() || protocol;
  if (!name) {
    actionError.value = '请填写模板名称或协议后再保存。';
    return;
  }
  if (!protocol) {
    actionError.value = '请先填写协议后再保存模板。';
    return;
  }
  let profile: Record<string, unknown> | undefined;
  try {
    profile = parseProfileOptional(createBindingForm.profile) ?? {};
  } catch (error) {
    return;
  }
  const template: ProtocolTemplate = {
    id: createTemplateId('binding'),
    name,
    kind: 'binding',
    protocol,
    role: createBindingForm.role,
    kernel_id: createBindingForm.kernel_id.trim() || undefined,
    listen: createBindingForm.listen.trim() || undefined,
    connect: createBindingForm.connect.trim() || undefined,
    access_port: createBindingForm.access_port ?? undefined,
    status: createBindingForm.status || undefined,
    tags: parseTags(createBindingForm.tags),
    description: createBindingForm.description.trim() || undefined,
    profile,
  };
  const nextStore: ProtocolTemplateStore = {
    binding: [...customTemplates.value.binding, template],
    entry: [...customTemplates.value.entry],
  };
  saveCustomTemplates(nextStore);
  customTemplates.value = nextStore;
  selectedBindingTemplateId.value = template.id;
  bindingTemplateName.value = '';
  actionMessage.value = `模板 ${template.name} 已保存`;
}

function handleSaveEntryTemplate() {
  actionMessage.value = '';
  actionError.value = '';
  const protocol = createEntryForm.protocol.trim();
  const name = entryTemplateName.value.trim() || createEntryForm.name.trim() || protocol;
  if (!name) {
    actionError.value = '请填写模板名称后再保存。';
    return;
  }
  let profile: Record<string, unknown> | undefined;
  try {
    profile = parseProfileOptional(createEntryForm.profile) ?? {};
  } catch (error) {
    return;
  }
  const template: ProtocolTemplate = {
    id: createTemplateId('entry'),
    name,
    kind: 'entry',
    protocol: protocol || undefined,
    entry_port: createEntryForm.entry_port ?? undefined,
    status: createEntryForm.status || undefined,
    tags: parseTags(createEntryForm.tags),
    description: createEntryForm.description.trim() || undefined,
    profile,
  };
  const nextStore: ProtocolTemplateStore = {
    binding: [...customTemplates.value.binding],
    entry: [...customTemplates.value.entry, template],
  };
  saveCustomTemplates(nextStore);
  customTemplates.value = nextStore;
  selectedEntryTemplateId.value = template.id;
  entryTemplateName.value = '';
  actionMessage.value = `模板 ${template.name} 已保存`;
}

function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,]+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function toggleBindingSelection(id: number, checked: boolean | 'indeterminate') {
  const next = new Set(selectedBindingIds.value);
  if (checked === true) {
    next.add(id);
  } else {
    next.delete(id);
  }
  selectedBindingIds.value = Array.from(next);
}

function toggleAllBindings(checked: boolean | 'indeterminate') {
  if (!visibleBindingIds.value.length) {
    return;
  }
  const next = new Set(selectedBindingIds.value);
  if (checked === true) {
    visibleBindingIds.value.forEach((id) => next.add(id));
  } else {
    visibleBindingIds.value.forEach((id) => next.delete(id));
  }
  selectedBindingIds.value = Array.from(next);
}

function clearSelectedBindings() {
  selectedBindingIds.value = [];
}

function applySyncResults(results: Array<{ binding_id: number; status: number; synced_at?: number }>) {
  const resultMap = new Map(results.map((result) => [result.binding_id, result]));
  bindings.value = bindings.value.map((binding) => {
    const result = resultMap.get(binding.id);
    if (!result) {
      return binding;
    }
    if (result.status !== 1 && result.status !== 2) {
      return binding;
    }
    return {
      ...binding,
      sync_status: result.status === 1 ? 2 : 3,
      last_synced_at: result.synced_at ?? binding.last_synced_at,
    };
  });
}

async function loadBindings(reset = true) {
  if (reset) {
    bindingsLoading.value = true;
    bindingsPage.value = 1;
  } else {
    bindingsLoadingMore.value = true;
  }

  bindingsError.value = '';

  try {
    const response = await adminApi.fetchAdminProtocolBindings({
      page: bindingsPage.value,
      per_page: 20,
      q: bindingFilters.q.trim() || undefined,
      protocol:
        bindingFilters.protocol && bindingFilters.protocol !== '__all__'
          ? bindingFilters.protocol
          : undefined,
      status:
        bindingFilters.status && bindingFilters.status !== '__all__'
          ? bindingFilters.status
          : undefined,
      node_id: bindingFilters.node_id ? Number(bindingFilters.node_id) : undefined,
    });

    if (reset) {
      bindings.value = response.bindings ?? [];
    } else {
      bindings.value = [...bindings.value, ...(response.bindings ?? [])];
    }
    bindingsPagination.value = response.pagination ?? null;
  } catch (error) {
    bindingsError.value = '节点协议绑定加载失败。';
  } finally {
    bindingsLoading.value = false;
    bindingsLoadingMore.value = false;
  }
}

async function loadEntries(reset = true) {
  if (reset) {
    entriesLoading.value = true;
    entriesPage.value = 1;
  } else {
    entriesLoadingMore.value = true;
  }

  entriesError.value = '';

  try {
    const response = await adminApi.fetchAdminProtocolEntries({
      page: entriesPage.value,
      per_page: 20,
      q: entryFilters.q.trim() || undefined,
      protocol:
        entryFilters.protocol && entryFilters.protocol !== '__all__'
          ? entryFilters.protocol
          : undefined,
      status:
        entryFilters.status && entryFilters.status !== '__all__'
          ? entryFilters.status
          : undefined,
      binding_id: entryFilters.binding_id ? Number(entryFilters.binding_id) : undefined,
    });

    if (reset) {
      entries.value = response.entries ?? [];
    } else {
      entries.value = [...entries.value, ...(response.entries ?? [])];
    }
    entriesPagination.value = response.pagination ?? null;
  } catch (error) {
    entriesError.value = '对外入口加载失败。';
  } finally {
    entriesLoading.value = false;
    entriesLoadingMore.value = false;
  }
}

async function loadMoreBindings() {
  if (!hasNextBindings.value || bindingsLoadingMore.value) return;
  bindingsPage.value += 1;
  await loadBindings(false);
}

async function loadMoreEntries() {
  if (!hasNextEntries.value || entriesLoadingMore.value) return;
  entriesPage.value += 1;
  await loadEntries(false);
}

function openEditBinding(binding: ProtocolBindingSummary) {
  selectedBinding.value = binding;
  editBindingForm.name = binding.name || '';
  editBindingForm.node_id = binding.node_id ?? null;
  editBindingForm.protocol = binding.protocol || '';
  editBindingForm.role = binding.role || 'listener';
  editBindingForm.listen = binding.listen || '';
  editBindingForm.connect = binding.connect || '';
  editBindingForm.access_port = binding.access_port ?? null;
  editBindingForm.status = binding.status ?? 1;
  editBindingForm.kernel_id = binding.kernel_id || '';
  editBindingForm.tags = stringifyTags(binding.tags);
  editBindingForm.description = binding.description || '';
  editBindingForm.profile = formatProfile(binding.profile);
  showEditBindingModal.value = true;
}

function openDeleteBinding(binding: ProtocolBindingSummary) {
  selectedBinding.value = binding;
  showDeleteBindingModal.value = true;
}

function openEditEntry(entry: ProtocolEntrySummary) {
  selectedEntry.value = entry;
  editEntryForm.name = entry.name || '';
  editEntryForm.binding_id = entry.binding_id;
  editEntryForm.entry_address = entry.entry_address;
  editEntryForm.entry_port = entry.entry_port;
  editEntryForm.protocol = entry.protocol || '';
  editEntryForm.status = entry.status ?? 1;
  editEntryForm.tags = stringifyTags(entry.tags);
  editEntryForm.description = entry.description || '';
  editEntryForm.profile = formatProfile(entry.profile);
  showEditEntryModal.value = true;
}

function openDeleteEntry(entry: ProtocolEntrySummary) {
  selectedEntry.value = entry;
  showDeleteEntryModal.value = true;
}

async function handleCreateBinding() {
  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: CreateProtocolBindingRequest = {
      name: createBindingForm.name.trim() || undefined,
      node_id: createBindingForm.node_id || 0,
      protocol: createBindingForm.protocol.trim(),
      role: createBindingForm.role,
      listen: createBindingForm.listen.trim() || undefined,
      connect: createBindingForm.connect.trim() || undefined,
      access_port: createBindingForm.access_port ?? undefined,
      status: createBindingForm.status || undefined,
      kernel_id: createBindingForm.kernel_id.trim(),
      tags: parseTags(createBindingForm.tags),
      description: createBindingForm.description.trim() || undefined,
      profile: parseProfileRequired(createBindingForm.profile),
    };

    if (!payload.node_id || !payload.protocol || !payload.kernel_id) {
      actionError.value = '请补充节点、协议、内核 ID 与 profile。';
      return;
    }

    await adminApi.createAdminProtocolBinding(payload);
    actionMessage.value = '节点协议绑定已创建。';
    showCreateBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '创建失败，请检查输入。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateBinding() {
  if (!selectedBinding.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: UpdateProtocolBindingRequest = {
      name: editBindingForm.name.trim() || undefined,
      node_id: editBindingForm.node_id || undefined,
      protocol: editBindingForm.protocol.trim() || undefined,
      role: editBindingForm.role || undefined,
      listen: editBindingForm.listen.trim() || undefined,
      connect: editBindingForm.connect.trim() || undefined,
      access_port: editBindingForm.access_port ?? undefined,
      status: editBindingForm.status || undefined,
      kernel_id: editBindingForm.kernel_id.trim() || undefined,
      tags: parseTags(editBindingForm.tags),
      description: editBindingForm.description.trim() || undefined,
      profile: parseProfileOptional(editBindingForm.profile),
    };

    await adminApi.updateAdminProtocolBinding(selectedBinding.value.id, payload);
    actionMessage.value = '节点协议绑定已更新。';
    showEditBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '更新失败，请稍后重试。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteBinding() {
  if (!selectedBinding.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolBinding(selectedBinding.value.id);
    actionMessage.value = '节点协议绑定已删除。';
    showDeleteBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    actionError.value = '删除失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

async function handleSyncBinding(binding: ProtocolBindingSummary) {
  if (syncingBinding.value) return;
  syncingBinding.value = true;
  actionMessage.value = '';
  actionError.value = '';

  try {
    const result = await adminApi.syncAdminProtocolBinding(binding.id);
    actionMessage.value = result.message || '同步已触发。';
    bindings.value = bindings.value.map((item) => {
      if (item.id !== binding.id) {
        return item;
      }
      if (result.status !== 1 && result.status !== 2) {
        return item;
      }
      return {
        ...item,
        sync_status: result.status === 1 ? 2 : 3,
        last_synced_at: result.synced_at ?? item.last_synced_at,
      };
    });
  } catch (error) {
    actionError.value = '同步失败，请稍后重试。';
  } finally {
    syncingBinding.value = false;
  }
}

async function handleBatchSyncBindings() {
  if (batchSyncing.value) return;
  if (!selectedBindingIds.value.length) {
    actionError.value = '请先选择需要同步的节点绑定。';
    return;
  }

  actionMessage.value = '';
  actionError.value = '';
  batchSyncing.value = true;

  try {
    const response = await adminApi.syncAdminProtocolBindings({
      binding_ids: selectedBindingIds.value,
    });
    const results = response.results ?? [];
    if (!results.length) {
      actionError.value = '未返回批量同步结果。';
      return;
    }
    applySyncResults(results);
    actionMessage.value = `已触发批量同步（${results.length} 条）。`;
  } catch (error) {
    actionError.value = '批量同步失败，请稍后重试。';
  } finally {
    batchSyncing.value = false;
  }
}

async function handleBatchSyncByNodes() {
  if (batchSyncing.value) return;
  const nodeIds = parseNumberList(batchNodeIds.value);
  if (!nodeIds.length) {
    actionError.value = '请输入需要同步的节点 ID。';
    return;
  }

  actionMessage.value = '';
  actionError.value = '';
  batchSyncing.value = true;

  try {
    const response = await adminApi.syncAdminProtocolBindings({ node_ids: nodeIds });
    const results = response.results ?? [];
    if (!results.length) {
      actionError.value = '未返回节点同步结果。';
      return;
    }
    applySyncResults(results);
    actionMessage.value = `已按节点触发同步（${results.length} 条）。`;
  } catch (error) {
    actionError.value = '节点同步失败，请稍后重试。';
  } finally {
    batchSyncing.value = false;
  }
}

async function handleCreateEntry() {
  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: CreateProtocolEntryRequest = {
      name: createEntryForm.name.trim() || undefined,
      binding_id: createEntryForm.binding_id || 0,
      entry_address: createEntryForm.entry_address.trim(),
      entry_port: createEntryForm.entry_port || 0,
      protocol: createEntryForm.protocol.trim() || undefined,
      status: createEntryForm.status || undefined,
      tags: parseTags(createEntryForm.tags),
      description: createEntryForm.description.trim() || undefined,
      profile: parseProfileOptional(createEntryForm.profile),
    };

    if (!payload.binding_id || !payload.entry_address || !payload.entry_port) {
      actionError.value = '请填写绑定实例 ID、入口地址与端口。';
      return;
    }

    await adminApi.createAdminProtocolEntry(payload);
    actionMessage.value = '对外入口已创建。';
    showCreateEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '创建失败，请检查输入。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateEntry() {
  if (!selectedEntry.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: UpdateProtocolEntryRequest = {
      name: editEntryForm.name.trim() || undefined,
      binding_id: editEntryForm.binding_id || undefined,
      entry_address: editEntryForm.entry_address.trim() || undefined,
      entry_port: editEntryForm.entry_port ?? undefined,
      protocol: editEntryForm.protocol.trim() || undefined,
      status: editEntryForm.status || undefined,
      tags: parseTags(editEntryForm.tags),
      description: editEntryForm.description.trim() || undefined,
      profile: parseProfileOptional(editEntryForm.profile),
    };

    await adminApi.updateAdminProtocolEntry(selectedEntry.value.id, payload);
    actionMessage.value = '对外入口已更新。';
    showEditEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '更新失败，请稍后重试。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteEntry() {
  if (!selectedEntry.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolEntry(selectedEntry.value.id);
    actionMessage.value = '对外入口已删除。';
    showDeleteEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    actionError.value = '删除失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

watch(showCreateBindingModal, (value) => {
  if (value) {
    selectedBindingTemplateId.value = '';
    bindingTemplateName.value = '';
  }
});

watch(showCreateEntryModal, (value) => {
  if (value) {
    selectedEntryTemplateId.value = '';
    entryTemplateName.value = '';
  }
});

watch(activeTab, (value) => {
  if (value === 'bindings' && !bindings.value.length) {
    void loadBindings(true);
  }
  if (value === 'entries' && !entries.value.length) {
    void loadEntries(true);
  }
});

onMounted(() => {
  void loadBindings(true);
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">协议</p>
        <h3 class="page-section__title">节点协议绑定与对外入口</h3>
        <p class="page__subtitle">模板用于预设参数，绑定用于关联节点，入口用于对外发布。</p>
      </div>
      <div class="page-section__actions">
        <Button
          type="button"
          :variant="activeTab === 'bindings' ? 'default' : 'secondary'"
          @click="activeTab = 'bindings'"
        >
          节点协议绑定
        </Button>
        <Button
          type="button"
          :variant="activeTab === 'entries' ? 'default' : 'secondary'"
          @click="activeTab = 'entries'"
        >
          对外入口
        </Button>
        <Button
          v-if="activeTab === 'bindings'"
          type="button"
          @click="showCreateBindingModal = true"
        >
          新建节点绑定
        </Button>
        <Button
          v-if="activeTab === 'entries'"
          type="button"
          @click="showCreateEntryModal = true"
        >
          新建入口
        </Button>
      </div>
    </header>

    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <Card v-if="activeTab === 'bindings'" class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>节点协议绑定</CardTitle>
          <p class="panel-card__meta">/protocol-bindings</p>
        </div>
        <div class="cluster cluster--gap">
          <Input v-model="bindingFilters.q" placeholder="搜索节点绑定名称或节点" class="w-56" />
          <Select v-model="bindingFilters.protocol">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="vless">VLESS</SelectItem>
              <SelectItem value="vmess">VMess</SelectItem>
              <SelectItem value="trojan">Trojan</SelectItem>
              <SelectItem value="ss">Shadowsocks</SelectItem>
              <SelectItem value="hysteria">Hysteria</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="bindingFilters.status">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem :value="1">启用</SelectItem>
              <SelectItem :value="2">停用</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="bindingFilters.node_id" placeholder="节点 ID" class="w-28" />
          <Button type="button" variant="secondary" @click="loadBindings(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert v-if="bindingsError" variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{{ bindingsError }}</AlertDescription>
        </Alert>
        <div class="cluster cluster--between cluster--center mb-4">
          <div class="cluster cluster--center">
            <p class="text-sm text-muted-foreground">已选 {{ selectedBindingCount }} 项</p>
            <Button
              v-if="selectedBindingCount"
              type="button"
              variant="ghost"
              @click="clearSelectedBindings"
            >
              清空选择
            </Button>
          </div>
          <div class="cluster cluster--gap">
            <Input v-model="batchNodeIds" placeholder="节点 ID（逗号分隔）" class="w-56" />
            <Button
              type="button"
              variant="secondary"
              :disabled="batchSyncing"
              @click="handleBatchSyncByNodes"
            >
              按节点同步
            </Button>
            <Button
              type="button"
              :disabled="batchSyncing || !selectedBindingCount"
              @click="handleBatchSyncBindings"
            >
              同步已选
            </Button>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mb-4">
          按节点同步会下发该节点全部绑定，按勾选仅同步指定绑定。
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox
                  :checked="bindingSelectionState"
                  :disabled="!bindings.length"
                  aria-label="全选绑定"
                  @update:checked="toggleAllBindings"
                />
              </TableHead>
              <TableHead>名称</TableHead>
              <TableHead>节点</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>同步</TableHead>
              <TableHead>最近同步</TableHead>
              <TableHead class="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="binding in bindings" :key="binding.id">
              <TableCell>
                <Checkbox
                  :checked="selectedBindingIds.includes(binding.id)"
                  :aria-label="`选择绑定 ${binding.id}`"
                  @update:checked="(checked) => toggleBindingSelection(binding.id, checked)"
                />
              </TableCell>
              <TableCell>
                <p class="font-medium">{{ binding.name || '-' }}</p>
                <p class="text-xs text-muted-foreground">#{{ binding.id }}</p>
              </TableCell>
              <TableCell>{{ binding.node_name || binding.node_id || '-' }}</TableCell>
              <TableCell>{{ binding.protocol || '-' }}</TableCell>
              <TableCell>
                <Badge :variant="bindingStatusVariant(binding.status)">
                  {{ bindingStatusLabel(binding.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="syncStatusVariant(binding.sync_status)">
                  {{ syncStatusLabel(binding.sync_status) }}
                </Badge>
              </TableCell>
              <TableCell>{{ formatDateTime(binding.last_synced_at) }}</TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="secondary" @click="handleSyncBinding(binding)">同步</Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openEditBinding(binding)">
                  编辑
                </Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openDeleteBinding(binding)">
                  删除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!bindings.length && !bindingsLoading" class="panel-card__empty">暂无节点绑定。</div>
        <div class="panel-card__footer" v-if="bindingsPagination">
          <p class="panel-card__meta">已显示 {{ bindings.length }} / {{ bindingsPagination.total_count }}</p>
          <Button
            type="button"
            variant="secondary"
            @click="loadMoreBindings"
            :disabled="!hasNextBindings || bindingsLoadingMore"
          >
            {{ bindingsLoadingMore ? '加载中...' : hasNextBindings ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-else class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>对外入口</CardTitle>
          <p class="panel-card__meta">/protocol-entries</p>
        </div>
        <div class="cluster cluster--gap">
          <Input v-model="entryFilters.q" placeholder="搜索入口或节点" class="w-56" />
          <Select v-model="entryFilters.protocol">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="vless">VLESS</SelectItem>
              <SelectItem value="vmess">VMess</SelectItem>
              <SelectItem value="trojan">Trojan</SelectItem>
              <SelectItem value="ss">Shadowsocks</SelectItem>
              <SelectItem value="hysteria">Hysteria</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="entryFilters.status">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem :value="1">启用</SelectItem>
              <SelectItem :value="2">停用</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="entryFilters.binding_id" placeholder="绑定实例 ID" class="w-28" />
          <Button type="button" variant="secondary" @click="loadEntries(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert v-if="entriesError" variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{{ entriesError }}</AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>绑定实例</TableHead>
              <TableHead>入口</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>健康</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead class="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="entry in entries" :key="entry.id">
              <TableCell>
                <p class="font-medium">{{ entry.name || '-' }}</p>
                <p class="text-xs text-muted-foreground">#{{ entry.id }}</p>
              </TableCell>
              <TableCell>{{ entry.binding_name || entry.binding_id }}</TableCell>
              <TableCell>{{ entry.entry_address }}:{{ entry.entry_port }}</TableCell>
              <TableCell>
                <Badge :variant="entryStatusVariant(entry.status)">{{ entryStatusLabel(entry.status) }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="healthStatusVariant(entry.health_status)">
                  {{ healthStatusLabel(entry.health_status) }}
                </Badge>
              </TableCell>
              <TableCell>{{ formatDateTime(entry.updated_at) }}</TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="outline" @click="openEditEntry(entry)">编辑</Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openDeleteEntry(entry)">
                  删除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!entries.length && !entriesLoading" class="panel-card__empty">暂无对外入口。</div>
        <div class="panel-card__footer" v-if="entriesPagination">
          <p class="panel-card__meta">已显示 {{ entries.length }} / {{ entriesPagination.total_count }}</p>
          <Button
            type="button"
            variant="secondary"
            @click="loadMoreEntries"
            :disabled="!hasNextEntries || entriesLoadingMore"
          >
            {{ entriesLoadingMore ? '加载中...' : hasNextEntries ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateBindingModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>新建节点协议绑定</DialogTitle>
          <DialogDescription>选择模板后绑定到节点。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div class="form-grid__full">
            <Label>协议模板（预设）</Label>
            <div class="cluster cluster--between">
              <Select v-model="selectedBindingTemplateId">
                <SelectTrigger class="w-64">
                  <SelectValue placeholder="选择预设模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="template in bindingTemplates"
                    :key="template.id"
                    :value="template.id"
                  >
                    {{ template.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div class="cluster">
                <Button variant="secondary" type="button" @click="handleApplyBindingTemplate">
                  应用模板
                </Button>
                <Button variant="outline" type="button" @click="handleSaveBindingTemplate">
                  保存为模板
                </Button>
              </div>
            </div>
            <Input v-model="bindingTemplateName" placeholder="模板名称（保存为预设）" />
          </div>
          <div>
            <Label for="binding-name">名称</Label>
            <Input id="binding-name" v-model="createBindingForm.name" placeholder="LA vless" />
          </div>
          <div>
            <Label for="binding-node">节点 ID</Label>
            <Input id="binding-node" v-model.number="createBindingForm.node_id" type="number" />
          </div>
          <div>
            <Label for="binding-protocol">协议</Label>
            <Input id="binding-protocol" v-model="createBindingForm.protocol" placeholder="vless" />
          </div>
          <div>
            <Label for="binding-role">角色</Label>
            <Select v-model="createBindingForm.role">
              <SelectTrigger id="binding-role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listener">listener</SelectItem>
                <SelectItem value="connector">connector</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-kernel">内核 ID</Label>
            <Input id="binding-kernel" v-model="createBindingForm.kernel_id" placeholder="vless-la" />
          </div>
          <div>
            <Label for="binding-status">状态</Label>
            <Select v-model="createBindingForm.status">
              <SelectTrigger id="binding-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-listen">监听</Label>
            <Input id="binding-listen" v-model="createBindingForm.listen" placeholder="0.0.0.0:443" />
          </div>
          <div>
            <Label for="binding-connect">转发</Label>
            <Input id="binding-connect" v-model="createBindingForm.connect" placeholder="127.0.0.1:10000" />
          </div>
          <div>
            <Label for="binding-port">访问端口</Label>
            <Input id="binding-port" v-model.number="createBindingForm.access_port" type="number" />
          </div>
          <div>
            <Label for="binding-tags">标签</Label>
            <Input id="binding-tags" v-model="createBindingForm.tags" placeholder="edge, hk" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-desc">说明</Label>
            <Input id="binding-desc" v-model="createBindingForm.description" placeholder="描述" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-profile">Profile (JSON)</Label>
            <Textarea id="binding-profile" v-model="createBindingForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showCreateBindingModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateBinding">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditBindingModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>编辑节点协议绑定</DialogTitle>
          <DialogDescription>更新节点绑定配置。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="binding-edit-name">名称</Label>
            <Input id="binding-edit-name" v-model="editBindingForm.name" />
          </div>
          <div>
            <Label for="binding-edit-node">节点 ID</Label>
            <Input id="binding-edit-node" v-model.number="editBindingForm.node_id" type="number" />
          </div>
          <div>
            <Label for="binding-edit-protocol">协议</Label>
            <Input id="binding-edit-protocol" v-model="editBindingForm.protocol" />
          </div>
          <div>
            <Label for="binding-edit-role">角色</Label>
            <Select v-model="editBindingForm.role">
              <SelectTrigger id="binding-edit-role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listener">listener</SelectItem>
                <SelectItem value="connector">connector</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-edit-kernel">内核 ID</Label>
            <Input id="binding-edit-kernel" v-model="editBindingForm.kernel_id" />
          </div>
          <div>
            <Label for="binding-edit-status">状态</Label>
            <Select v-model="editBindingForm.status">
              <SelectTrigger id="binding-edit-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-edit-listen">监听</Label>
            <Input id="binding-edit-listen" v-model="editBindingForm.listen" />
          </div>
          <div>
            <Label for="binding-edit-connect">转发</Label>
            <Input id="binding-edit-connect" v-model="editBindingForm.connect" />
          </div>
          <div>
            <Label for="binding-edit-port">访问端口</Label>
            <Input id="binding-edit-port" v-model.number="editBindingForm.access_port" type="number" />
          </div>
          <div>
            <Label for="binding-edit-tags">标签</Label>
            <Input id="binding-edit-tags" v-model="editBindingForm.tags" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-edit-desc">说明</Label>
            <Input id="binding-edit-desc" v-model="editBindingForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-edit-profile">Profile (JSON)</Label>
            <Textarea id="binding-edit-profile" v-model="editBindingForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showEditBindingModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateBinding">
            {{ isSaving ? '保存中...' : '更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteBindingModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            删除节点绑定 {{ selectedBinding?.name || selectedBinding?.id }} 后无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showDeleteBindingModal = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="isSaving" @click="handleDeleteBinding">
            {{ isSaving ? '处理中...' : '删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showCreateEntryModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>新建对外入口</DialogTitle>
          <DialogDescription>填写对外入口信息。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div class="form-grid__full">
            <Label>协议模板（预设）</Label>
            <div class="cluster cluster--between">
              <Select v-model="selectedEntryTemplateId">
                <SelectTrigger class="w-64">
                  <SelectValue placeholder="选择预设模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="template in entryTemplates" :key="template.id" :value="template.id">
                    {{ template.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div class="cluster">
                <Button variant="secondary" type="button" @click="handleApplyEntryTemplate">
                  应用模板
                </Button>
                <Button variant="outline" type="button" @click="handleSaveEntryTemplate">
                  保存为模板
                </Button>
              </div>
            </div>
            <Input v-model="entryTemplateName" placeholder="模板名称（保存为预设）" />
          </div>
          <div>
            <Label for="entry-name">名称</Label>
            <Input id="entry-name" v-model="createEntryForm.name" placeholder="LA entry" />
          </div>
          <div>
            <Label for="entry-binding">绑定实例 ID</Label>
            <Input id="entry-binding" v-model.number="createEntryForm.binding_id" type="number" />
          </div>
          <div>
            <Label for="entry-address">入口地址</Label>
            <Input id="entry-address" v-model="createEntryForm.entry_address" placeholder="la.example.com" />
          </div>
          <div>
            <Label for="entry-port">入口端口</Label>
            <Input id="entry-port" v-model.number="createEntryForm.entry_port" type="number" />
          </div>
          <div>
            <Label for="entry-protocol">协议</Label>
            <Input id="entry-protocol" v-model="createEntryForm.protocol" placeholder="可选" />
          </div>
          <div>
            <Label for="entry-status">状态</Label>
            <Select v-model="createEntryForm.status">
              <SelectTrigger id="entry-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="entry-tags">标签</Label>
            <Input id="entry-tags" v-model="createEntryForm.tags" placeholder="edge" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-desc">说明</Label>
            <Input id="entry-desc" v-model="createEntryForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-profile">Profile (JSON)</Label>
            <Textarea id="entry-profile" v-model="createEntryForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showCreateEntryModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateEntry">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditEntryModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>编辑对外入口</DialogTitle>
          <DialogDescription>更新对外入口信息。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="entry-edit-name">名称</Label>
            <Input id="entry-edit-name" v-model="editEntryForm.name" />
          </div>
          <div>
            <Label for="entry-edit-binding">绑定实例 ID</Label>
            <Input id="entry-edit-binding" v-model.number="editEntryForm.binding_id" type="number" />
          </div>
          <div>
            <Label for="entry-edit-address">入口地址</Label>
            <Input id="entry-edit-address" v-model="editEntryForm.entry_address" />
          </div>
          <div>
            <Label for="entry-edit-port">入口端口</Label>
            <Input id="entry-edit-port" v-model.number="editEntryForm.entry_port" type="number" />
          </div>
          <div>
            <Label for="entry-edit-protocol">协议</Label>
            <Input id="entry-edit-protocol" v-model="editEntryForm.protocol" />
          </div>
          <div>
            <Label for="entry-edit-status">状态</Label>
            <Select v-model="editEntryForm.status">
              <SelectTrigger id="entry-edit-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="entry-edit-tags">标签</Label>
            <Input id="entry-edit-tags" v-model="editEntryForm.tags" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-edit-desc">说明</Label>
            <Input id="entry-edit-desc" v-model="editEntryForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-edit-profile">Profile (JSON)</Label>
            <Textarea id="entry-edit-profile" v-model="editEntryForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showEditEntryModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateEntry">
            {{ isSaving ? '保存中...' : '更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteEntryModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            删除入口 {{ selectedEntry?.name || selectedEntry?.id }} 后无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showDeleteEntryModal = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="isSaving" @click="handleDeleteEntry">
            {{ isSaving ? '处理中...' : '删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
