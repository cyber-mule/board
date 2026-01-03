<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  CreateProtocolBindingRequest,
  CreateProtocolConfigRequest,
  PaginationMeta,
  ProtocolBindingSummary,
  ProtocolBindingSyncResult,
  ProtocolConfigSummary,
  UpdateProtocolBindingRequest,
  UpdateProtocolConfigRequest,
} from '../../../api/types';

type ProtocolTab = 'configs' | 'bindings';

type ProtocolConfigTemplate = {
  id: string;
  name: string;
  protocol: string;
  profile: Record<string, unknown>;
};

const protocolConfigTemplates: ProtocolConfigTemplate[] = [
  {
    id: 'vless-grpc',
    name: 'VLESS / gRPC + TLS',
    protocol: 'vless',
    profile: {
      transport: 'grpc',
      tls: true,
      flow: '',
      multiplex: {
        enabled: true,
        max_streams: 32,
      },
    },
  },
  {
    id: 'vless-reality',
    name: 'VLESS / Reality + TCP',
    protocol: 'vless',
    profile: {
      transport: 'tcp',
      tls: true,
      security: 'reality',
      reality: {
        enabled: true,
        server_name: 'example.com',
        public_key: '',
        short_id: '',
      },
    },
  },
  {
    id: 'vless-ws-no-tls',
    name: 'VLESS / WebSocket (No TLS)',
    protocol: 'vless',
    profile: {
      transport: 'ws',
      tls: false,
      path: '/ws',
      headers: {
        host: 'example.com',
      },
    },
  },
  {
    id: 'vless-tcp-no-tls',
    name: 'VLESS / TCP (No TLS)',
    protocol: 'vless',
    profile: {
      transport: 'tcp',
      tls: false,
      security: 'none',
    },
  },
  {
    id: 'vmess-ws',
    name: 'VMess / WebSocket + TLS',
    protocol: 'vmess',
    profile: {
      transport: 'ws',
      tls: true,
      path: '/ws',
      headers: {
        host: 'example.com',
      },
      mux: {
        enabled: true,
        concurrency: 8,
      },
    },
  },
  {
    id: 'vmess-ws-no-tls',
    name: 'VMess / WebSocket (No TLS)',
    protocol: 'vmess',
    profile: {
      transport: 'ws',
      tls: false,
      path: '/ws',
      headers: {
        host: 'example.com',
      },
      mux: {
        enabled: true,
        concurrency: 8,
      },
    },
  },
  {
    id: 'vmess-tcp-no-tls',
    name: 'VMess / TCP (No TLS)',
    protocol: 'vmess',
    profile: {
      transport: 'tcp',
      tls: false,
      security: 'none',
    },
  },
  {
    id: 'trojan-tcp',
    name: 'Trojan / TCP + TLS',
    protocol: 'trojan',
    profile: {
      transport: 'tcp',
      tls: true,
      alpn: ['h2', 'http/1.1'],
      fallback: '',
    },
  },
  {
    id: 'shadowsocks',
    name: 'Shadowsocks / AEAD',
    protocol: 'shadowsocks',
    profile: {
      method: 'aes-128-gcm',
      password_mode: 'uuid',
      udp: true,
      tcp_fast_open: true,
    },
  },
  {
    id: 'hysteria2',
    name: 'Hysteria2 / QUIC',
    protocol: 'hysteria',
    profile: {
      version: 2,
      tls: true,
      congestion: 'bbr',
      mtu: 1300,
      obfs: {
        type: 'salamander',
        password: '',
      },
    },
  },
];

const activeTab = ref<ProtocolTab>('configs');

const configs = ref<ProtocolConfigSummary[]>([]);
const configsLoading = ref(true);
const configsLoadingMore = ref(false);
const configsError = ref('');
const configsPage = ref(1);
const configsPagination = ref<PaginationMeta | null>(null);

const bindings = ref<ProtocolBindingSummary[]>([]);
const bindingsLoading = ref(true);
const bindingsLoadingMore = ref(false);
const bindingsError = ref('');
const bindingsPage = ref(1);
const bindingsPagination = ref<PaginationMeta | null>(null);

const selectedConfig = ref<ProtocolConfigSummary | null>(null);
const selectedBinding = ref<ProtocolBindingSummary | null>(null);

const actionMessage = ref('');
const actionError = ref('');
const isSaving = ref(false);
const syncingBinding = ref(false);

const configFilters = reactive({
  q: '',
  protocol: '',
  status: '',
});

const bindingFilters = reactive({
  q: '',
  protocol: '',
  status: '',
  node_id: '',
  protocol_config_id: '',
});

const showCreateConfigModal = ref(false);
const showEditConfigModal = ref(false);
const showDeleteConfigModal = ref(false);

const showCreateBindingModal = ref(false);
const showEditBindingModal = ref(false);
const showDeleteBindingModal = ref(false);

const createConfigForm = reactive<CreateProtocolConfigRequest & { tags: string[] }>({
  name: '',
  protocol: '',
  status: 'active',
  tags: [],
  description: '',
});

const editConfigForm = reactive<UpdateProtocolConfigRequest & { tags: string[] }>({
  name: '',
  protocol: '',
  status: '',
  tags: [],
  description: '',
});

const createBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol_config_id: number | null;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: string;
  kernel_id: string;
  tags: string[];
  description: string;
}>({
  name: '',
  node_id: null,
  protocol_config_id: null,
  role: '',
  listen: '',
  connect: '',
  access_port: null,
  status: '',
  kernel_id: '',
  tags: [],
  description: '',
});

const editBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol_config_id: number | null;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: string;
  kernel_id: string;
  tags: string[];
  description: string;
}>({
  name: '',
  node_id: null,
  protocol_config_id: null,
  role: '',
  listen: '',
  connect: '',
  access_port: null,
  status: '',
  kernel_id: '',
  tags: [],
  description: '',
});

const createConfigTagInput = ref('');
const editConfigTagInput = ref('');
const createBindingTagInput = ref('');
const editBindingTagInput = ref('');

const createConfigProfileInput = ref('');
const editConfigProfileInput = ref('');
const createConfigTemplate = ref('');
const editConfigTemplate = ref('');
const createBindingMetadataInput = ref('');
const editBindingMetadataInput = ref('');

const selectedConfigProfilePreview = computed(() => {
  if (!selectedConfig.value?.profile) {
    return '';
  }
  try {
    return JSON.stringify(selectedConfig.value.profile, null, 2);
  } catch (error) {
    return '';
  }
});

const selectedBindingMetadataPreview = computed(() => {
  if (!selectedBinding.value?.metadata) {
    return '';
  }
  try {
    return JSON.stringify(selectedBinding.value.metadata, null, 2);
  } catch (error) {
    return '';
  }
});

function switchTab(tab: ProtocolTab) {
  activeTab.value = tab;
  clearMessages();
}

function clearMessages() {
  actionMessage.value = '';
  actionError.value = '';
}

function statusVariant(value?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 'active':
    case 'online':
    case 'synced':
    case 'success':
      return 'default';
    case 'draft':
    case 'pending':
    case 'maintenance':
      return 'secondary';
    case 'offline':
    case 'disabled':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusLabel(value?: string) {
  switch (value) {
    case 'active':
      return '启用';
    case 'online':
      return '在线';
    case 'draft':
      return '草稿';
    case 'pending':
      return '待处理';
    case 'maintenance':
      return '维护';
    case 'offline':
      return '离线';
    case 'disabled':
      return '已禁用';
    case 'failed':
      return '失败';
    case 'synced':
      return '已同步';
    default:
      return value || '未知';
  }
}

function toOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function parseJsonInput(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { value: undefined, error: '' };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: undefined, error: '请输入 JSON 对象。' };
    }
    return { value: parsed as Record<string, unknown>, error: '' };
  } catch (error) {
    return { value: undefined, error: 'JSON 解析失败，请检查格式。' };
  }
}

function addTag(target: string[], input: typeof createConfigTagInput) {
  const value = input.value.trim();
  if (!value) {
    return;
  }
  if (!target.includes(value)) {
    target.push(value);
  }
  input.value = '';
}

function removeTag(target: string[], tag: string) {
  const index = target.indexOf(tag);
  if (index >= 0) {
    target.splice(index, 1);
  }
}

async function loadConfigs() {
  configsLoading.value = true;
  configsError.value = '';
  const selectedId = selectedConfig.value?.id ?? null;

  try {
    const response = await adminApi.fetchAdminProtocolConfigs({
      page: 1,
      per_page: 10,
      q: configFilters.q || undefined,
      protocol: configFilters.protocol || undefined,
      status: configFilters.status || undefined,
    });
    configs.value = response.configs ?? [];
    configsPagination.value = response.pagination ?? null;
    configsPage.value = response.pagination?.page ?? 1;
    if (selectedId) {
      selectedConfig.value = configs.value.find((item) => item.id === selectedId) ?? null;
    }
  } catch (error) {
    configsError.value = error instanceof Error ? error.message : '加载协议配置失败';
  } finally {
    configsLoading.value = false;
  }
}

async function loadMoreConfigs() {
  if (!configsPagination.value?.has_next || configsLoadingMore.value) {
    return;
  }

  configsLoadingMore.value = true;
  configsError.value = '';

  const targetPage = configsPage.value + 1;

  try {
    const response = await adminApi.fetchAdminProtocolConfigs({
      page: targetPage,
      per_page: 10,
      q: configFilters.q || undefined,
      protocol: configFilters.protocol || undefined,
      status: configFilters.status || undefined,
    });
    configs.value = [...configs.value, ...(response.configs ?? [])];
    configsPagination.value = response.pagination ?? null;
    configsPage.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    configsError.value = error instanceof Error ? error.message : '加载更多协议配置失败';
  } finally {
    configsLoadingMore.value = false;
  }
}

async function loadBindings() {
  bindingsLoading.value = true;
  bindingsError.value = '';
  const selectedId = selectedBinding.value?.id ?? null;

  try {
    const response = await adminApi.fetchAdminProtocolBindings({
      page: 1,
      per_page: 10,
      q: bindingFilters.q || undefined,
      protocol: bindingFilters.protocol || undefined,
      status: bindingFilters.status || undefined,
      node_id: toOptionalNumber(bindingFilters.node_id),
      protocol_config_id: toOptionalNumber(bindingFilters.protocol_config_id),
    });
    bindings.value = response.bindings ?? [];
    bindingsPagination.value = response.pagination ?? null;
    bindingsPage.value = response.pagination?.page ?? 1;
    if (selectedId) {
      selectedBinding.value = bindings.value.find((item) => item.id === selectedId) ?? null;
    }
  } catch (error) {
    bindingsError.value = error instanceof Error ? error.message : '加载协议绑定失败';
  } finally {
    bindingsLoading.value = false;
  }
}

async function loadMoreBindings() {
  if (!bindingsPagination.value?.has_next || bindingsLoadingMore.value) {
    return;
  }

  bindingsLoadingMore.value = true;
  bindingsError.value = '';

  const targetPage = bindingsPage.value + 1;

  try {
    const response = await adminApi.fetchAdminProtocolBindings({
      page: targetPage,
      per_page: 10,
      q: bindingFilters.q || undefined,
      protocol: bindingFilters.protocol || undefined,
      status: bindingFilters.status || undefined,
      node_id: toOptionalNumber(bindingFilters.node_id),
      protocol_config_id: toOptionalNumber(bindingFilters.protocol_config_id),
    });
    bindings.value = [...bindings.value, ...(response.bindings ?? [])];
    bindingsPagination.value = response.pagination ?? null;
    bindingsPage.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    bindingsError.value = error instanceof Error ? error.message : '加载更多协议绑定失败';
  } finally {
    bindingsLoadingMore.value = false;
  }
}

function resetConfigFilters() {
  configFilters.q = '';
  configFilters.protocol = '';
  configFilters.status = '';
  void loadConfigs();
}

function resetBindingFilters() {
  bindingFilters.q = '';
  bindingFilters.protocol = '';
  bindingFilters.status = '';
  bindingFilters.node_id = '';
  bindingFilters.protocol_config_id = '';
  void loadBindings();
}

function selectConfig(config: ProtocolConfigSummary) {
  selectedConfig.value = config;
}

function selectBinding(binding: ProtocolBindingSummary) {
  selectedBinding.value = binding;
}

function openCreateConfigModal() {
  clearMessages();
  createConfigForm.name = '';
  createConfigForm.protocol = '';
  createConfigForm.status = 'active';
  createConfigForm.tags = [];
  createConfigForm.description = '';
  createConfigProfileInput.value = '';
  createConfigTagInput.value = '';
  createConfigTemplate.value = '';
  showCreateConfigModal.value = true;
}

function openEditConfigModal(config: ProtocolConfigSummary) {
  clearMessages();
  selectedConfig.value = config;
  editConfigForm.name = config.name;
  editConfigForm.protocol = config.protocol;
  editConfigForm.status = config.status || '';
  editConfigForm.tags = config.tags ? [...config.tags] : [];
  editConfigForm.description = config.description || '';
  editConfigProfileInput.value = config.profile ? JSON.stringify(config.profile, null, 2) : '';
  editConfigTagInput.value = '';
  editConfigTemplate.value = '';
  showEditConfigModal.value = true;
}

function closeConfigModals() {
  showCreateConfigModal.value = false;
  showEditConfigModal.value = false;
}

function applyConfigTemplate(
  templateId: string,
  target: 'create' | 'edit',
) {
  const template = protocolConfigTemplates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }

  if (target === 'create') {
    if (!createConfigForm.name.trim()) {
      createConfigForm.name = template.name;
    }
    createConfigForm.protocol = template.protocol;
    createConfigProfileInput.value = JSON.stringify(template.profile, null, 2);
    return;
  }

  editConfigForm.protocol = template.protocol;
  editConfigProfileInput.value = JSON.stringify(template.profile, null, 2);
}

function openDeleteConfigModal(config: ProtocolConfigSummary) {
  clearMessages();
  selectedConfig.value = config;
  showDeleteConfigModal.value = true;
}

function closeDeleteConfigModal() {
  showDeleteConfigModal.value = false;
}

async function handleCreateConfig() {
  clearMessages();
  if (!createConfigForm.name.trim() || !createConfigForm.protocol.trim()) {
    actionError.value = '配置名称与协议不能为空';
    return;
  }

  const profileResult = parseJsonInput(createConfigProfileInput.value);
  if (profileResult.error) {
    actionError.value = profileResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: CreateProtocolConfigRequest = {
      name: createConfigForm.name.trim(),
      protocol: createConfigForm.protocol.trim(),
      status: createConfigForm.status.trim() || undefined,
      tags: createConfigForm.tags.length ? createConfigForm.tags : undefined,
      description: createConfigForm.description.trim() || undefined,
      profile: profileResult.value,
    };
    const response = await adminApi.createAdminProtocolConfig(payload);
    actionMessage.value = `协议配置 ${response.config.name} 已创建。`;
    closeConfigModals();
    await loadConfigs();
    selectedConfig.value = configs.value.find((item) => item.id === response.config.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建协议配置失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateConfig() {
  if (!selectedConfig.value) {
    return;
  }

  clearMessages();
  if (!editConfigForm.name.trim() || !editConfigForm.protocol.trim()) {
    actionError.value = '配置名称与协议不能为空';
    return;
  }

  const profileResult = parseJsonInput(editConfigProfileInput.value);
  if (profileResult.error) {
    actionError.value = profileResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: UpdateProtocolConfigRequest = {
      name: editConfigForm.name.trim(),
      protocol: editConfigForm.protocol.trim(),
      status: editConfigForm.status.trim() || undefined,
      tags: editConfigForm.tags,
      description: editConfigForm.description.trim() || undefined,
      profile: profileResult.value,
    };
    const response = await adminApi.updateAdminProtocolConfig(selectedConfig.value.id, payload);
    actionMessage.value = `协议配置 ${response.config.name} 已更新。`;
    closeConfigModals();
    await loadConfigs();
    selectedConfig.value = configs.value.find((item) => item.id === response.config.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新协议配置失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteConfig() {
  if (!selectedConfig.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolConfig(selectedConfig.value.id);
    actionMessage.value = `协议配置 ${selectedConfig.value.name} 已删除。`;
    closeDeleteConfigModal();
    selectedConfig.value = null;
    await loadConfigs();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除协议配置失败';
  } finally {
    isSaving.value = false;
  }
}

function openCreateBindingModal() {
  clearMessages();
  createBindingForm.name = '';
  createBindingForm.node_id = null;
  createBindingForm.protocol_config_id = null;
  createBindingForm.role = '';
  createBindingForm.listen = '';
  createBindingForm.connect = '';
  createBindingForm.access_port = null;
  createBindingForm.status = '';
  createBindingForm.kernel_id = '';
  createBindingForm.tags = [];
  createBindingForm.description = '';
  createBindingMetadataInput.value = '';
  createBindingTagInput.value = '';
  showCreateBindingModal.value = true;
}

function openEditBindingModal(binding: ProtocolBindingSummary) {
  clearMessages();
  selectedBinding.value = binding;
  editBindingForm.name = binding.name || '';
  editBindingForm.node_id = binding.node_id ?? null;
  editBindingForm.protocol_config_id = binding.protocol_config_id ?? null;
  editBindingForm.role = binding.role || '';
  editBindingForm.listen = binding.listen || '';
  editBindingForm.connect = binding.connect || '';
  editBindingForm.access_port = binding.access_port ?? null;
  editBindingForm.status = binding.status || '';
  editBindingForm.kernel_id = binding.kernel_id || '';
  editBindingForm.tags = binding.tags ? [...binding.tags] : [];
  editBindingForm.description = binding.description || '';
  editBindingMetadataInput.value = binding.metadata ? JSON.stringify(binding.metadata, null, 2) : '';
  editBindingTagInput.value = '';
  showEditBindingModal.value = true;
}

function closeBindingModals() {
  showCreateBindingModal.value = false;
  showEditBindingModal.value = false;
}

function openDeleteBindingModal(binding: ProtocolBindingSummary) {
  clearMessages();
  selectedBinding.value = binding;
  showDeleteBindingModal.value = true;
}

function closeDeleteBindingModal() {
  showDeleteBindingModal.value = false;
}

async function handleCreateBinding() {
  clearMessages();

  const nodeId = toOptionalNumber(createBindingForm.node_id);
  const configId = toOptionalNumber(createBindingForm.protocol_config_id);
  if (!nodeId || !configId || !createBindingForm.role.trim() || !createBindingForm.kernel_id.trim()) {
    actionError.value = '节点 ID、协议配置 ID、角色与内核协议 ID 为必填项';
    return;
  }

  const metadataResult = parseJsonInput(createBindingMetadataInput.value);
  if (metadataResult.error) {
    actionError.value = metadataResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: CreateProtocolBindingRequest = {
      name: createBindingForm.name.trim() || undefined,
      node_id: nodeId,
      protocol_config_id: configId,
      role: createBindingForm.role.trim(),
      listen: createBindingForm.listen.trim() || undefined,
      connect: createBindingForm.connect.trim() || undefined,
      access_port: toOptionalNumber(createBindingForm.access_port),
      status: createBindingForm.status.trim() || undefined,
      kernel_id: createBindingForm.kernel_id.trim(),
      tags: createBindingForm.tags.length ? createBindingForm.tags : undefined,
      description: createBindingForm.description.trim() || undefined,
      metadata: metadataResult.value,
    };
    const response = await adminApi.createAdminProtocolBinding(payload);
    actionMessage.value = `协议绑定 ${response.binding.id} 已创建。`;
    closeBindingModals();
    await loadBindings();
    selectedBinding.value = bindings.value.find((item) => item.id === response.binding.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建协议绑定失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateBinding() {
  if (!selectedBinding.value) {
    return;
  }

  clearMessages();
  const nodeId = toOptionalNumber(editBindingForm.node_id);
  const configId = toOptionalNumber(editBindingForm.protocol_config_id);
  if (!nodeId || !configId || !editBindingForm.role.trim()) {
    actionError.value = '节点 ID、协议配置 ID 与角色为必填项';
    return;
  }

  const metadataResult = parseJsonInput(editBindingMetadataInput.value);
  if (metadataResult.error) {
    actionError.value = metadataResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: UpdateProtocolBindingRequest = {
      name: editBindingForm.name.trim() || undefined,
      node_id: nodeId,
      protocol_config_id: configId,
      role: editBindingForm.role.trim(),
      listen: editBindingForm.listen.trim() || undefined,
      connect: editBindingForm.connect.trim() || undefined,
      access_port: toOptionalNumber(editBindingForm.access_port),
      status: editBindingForm.status.trim() || undefined,
      kernel_id: editBindingForm.kernel_id.trim() || undefined,
      tags: editBindingForm.tags,
      description: editBindingForm.description.trim() || undefined,
      metadata: metadataResult.value,
    };
    const response = await adminApi.updateAdminProtocolBinding(selectedBinding.value.id, payload);
    actionMessage.value = `协议绑定 ${response.binding.id} 已更新。`;
    closeBindingModals();
    await loadBindings();
    selectedBinding.value = bindings.value.find((item) => item.id === response.binding.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新协议绑定失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteBinding() {
  if (!selectedBinding.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolBinding(selectedBinding.value.id);
    actionMessage.value = `协议绑定 ${selectedBinding.value.id} 已删除。`;
    closeDeleteBindingModal();
    selectedBinding.value = null;
    await loadBindings();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除协议绑定失败';
  } finally {
    isSaving.value = false;
  }
}

async function syncBinding() {
  if (!selectedBinding.value || syncingBinding.value) {
    return;
  }

  clearMessages();
  syncingBinding.value = true;

  try {
    const result = await adminApi.syncAdminProtocolBinding(selectedBinding.value.id);
    applySyncResult(result);
    actionMessage.value = `协议绑定 ${selectedBinding.value.id} 已同步。`;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '同步协议绑定失败';
  } finally {
    syncingBinding.value = false;
  }
}

function applySyncResult(result: ProtocolBindingSyncResult) {
  const index = bindings.value.findIndex((binding) => binding.id === result.binding_id);
  if (index >= 0) {
    bindings.value[index] = {
      ...bindings.value[index],
      sync_status: result.status === 'success' ? 'synced' : result.status,
      last_synced_at: result.synced_at ?? bindings.value[index].last_synced_at,
      last_sync_error: result.status === 'success' ? undefined : result.message,
    };
    if (selectedBinding.value?.id === result.binding_id) {
      selectedBinding.value = bindings.value[index];
    }
  }
}

onMounted(() => {
  void loadConfigs();
  void loadBindings();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">协议</p>
        <h3 class="page-section__title">协议管理</h3>
        <p class="page__subtitle">维护协议配置与节点绑定。</p>
      </div>
      <div class="page-section__actions">
        <div class="cluster">
          <Button
            size="sm"
            type="button"
            :variant="activeTab === 'configs' ? 'default' : 'secondary'"
            @click="switchTab('configs')"
          >
            协议配置
          </Button>
          <Button
            size="sm"
            type="button"
            :variant="activeTab === 'bindings' ? 'default' : 'secondary'"
            @click="switchTab('bindings')"
          >
            协议绑定
          </Button>
        </div>
        <Button v-if="activeTab === 'configs'" type="button" @click="openCreateConfigModal">
          新建配置
        </Button>
        <Button v-else type="button" @click="openCreateBindingModal">
          新建绑定
        </Button>
        <Button
          variant="secondary"
          type="button"
          :disabled="activeTab === 'configs' ? configsLoading : bindingsLoading"
          @click="activeTab === 'configs' ? loadConfigs() : loadBindings()"
        >
          {{ activeTab === 'configs' && configsLoading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form v-if="activeTab === 'configs'" class="form-grid form-grid--wide" @submit.prevent="loadConfigs">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="configFilters.q" type="search" placeholder="名称、协议或标签" />
      </div>
      <div class="stack stack--tight">
        <Label>协议</Label>
        <Input v-model="configFilters.protocol" type="text" placeholder="例如 vless" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Input v-model="configFilters.status" type="text" placeholder="例如 active" />
      </div>
      <div class="cluster cluster--end">
        <Button type="submit">应用筛选</Button>
        <Button variant="secondary" type="button" @click="resetConfigFilters">重置</Button>
      </div>
    </form>

    <form v-else class="form-grid form-grid--wide" @submit.prevent="loadBindings">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="bindingFilters.q" type="search" placeholder="名称、节点或协议" />
      </div>
      <div class="stack stack--tight">
        <Label>协议</Label>
        <Input v-model="bindingFilters.protocol" type="text" placeholder="例如 vless" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Input v-model="bindingFilters.status" type="text" placeholder="例如 online" />
      </div>
      <div class="stack stack--tight">
        <Label>节点 ID</Label>
        <Input v-model="bindingFilters.node_id" type="number" placeholder="节点 ID" />
      </div>
      <div class="stack stack--tight">
        <Label>配置 ID</Label>
        <Input v-model="bindingFilters.protocol_config_id" type="number" placeholder="协议配置 ID" />
      </div>
      <div class="cluster cluster--end">
        <Button type="submit">应用筛选</Button>
        <Button variant="secondary" type="button" @click="resetBindingFilters">重置</Button>
      </div>
    </form>

    <Alert v-if="activeTab === 'configs' && configsError" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ configsError }}</AlertDescription>
    </Alert>
    <Alert v-if="activeTab === 'bindings' && bindingsError" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ bindingsError }}</AlertDescription>
    </Alert>
    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <div v-if="activeTab === 'configs'" class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>协议配置</CardTitle>
          <p class="panel-card__meta">共 {{ configs.length }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="configsLoading" class="panel-card__empty">正在加载配置...</p>
          <p v-else-if="configs.length === 0" class="panel-card__empty">暂无配置。</p>
          <ul v-else class="data-list">
            <li
              v-for="config in configs"
              :key="config.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedConfig?.id === config.id }]"
            >
              <div>
                <p class="data-row__title">{{ config.name }}</p>
                <p class="data-row__meta">{{ config.protocol }} · ID {{ config.id }}</p>
                <p class="data-row__meta">{{ config.description || '暂无描述' }}</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(config.status)">{{ statusLabel(config.status) }}</Badge>
                <span class="data-row__meta">{{ formatDateTime(config.updated_at) }}</span>
                <Button variant="ghost" size="sm" type="button" @click="selectConfig(config)">
                  详情
                </Button>
              </div>
            </li>
          </ul>
          <div v-if="configsPagination?.has_next" class="list-footer">
            <Button variant="ghost" type="button" @click="loadMoreConfigs" :disabled="configsLoadingMore">
              {{ configsLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="cluster cluster--between cluster--start cluster--wide">
          <div>
            <CardTitle>配置详情</CardTitle>
            <p class="panel-card__meta">
              {{ selectedConfig ? selectedConfig.name : '请选择配置' }}
            </p>
          </div>
          <div v-if="selectedConfig" class="page-section__actions">
            <Button variant="secondary" type="button" :disabled="isSaving" @click="openEditConfigModal(selectedConfig)">
              编辑
            </Button>
            <Button variant="destructive" type="button" :disabled="isSaving" @click="openDeleteConfigModal(selectedConfig)">
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p v-if="!selectedConfig" class="panel-card__empty">请选择协议配置查看详情。</p>
          <div v-else>
            <div class="detail-grid">
              <div>
                <p class="detail-label">协议</p>
                <p class="detail-value">{{ selectedConfig.protocol }}</p>
              </div>
              <div>
                <p class="detail-label">状态</p>
                <p class="detail-value">{{ statusLabel(selectedConfig.status) }}</p>
              </div>
              <div>
                <p class="detail-label">更新时间</p>
                <p class="detail-value">{{ formatDateTime(selectedConfig.updated_at) }}</p>
              </div>
            </div>
            <p class="detail-label">描述</p>
            <p class="detail-value">{{ selectedConfig.description || '暂无描述。' }}</p>
            <div v-if="selectedConfig.tags?.length" class="detail-section">
              <h4>标签</h4>
              <div class="cluster">
                <Badge v-for="tag in selectedConfig.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              </div>
            </div>
            <div class="detail-section">
              <h4>协议配置</h4>
              <p v-if="!selectedConfigProfilePreview" class="detail-label">暂无配置</p>
              <pre v-else class="code-block">{{ selectedConfigProfilePreview }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>协议绑定</CardTitle>
          <p class="panel-card__meta">共 {{ bindings.length }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="bindingsLoading" class="panel-card__empty">正在加载绑定...</p>
          <p v-else-if="bindings.length === 0" class="panel-card__empty">暂无绑定。</p>
          <ul v-else class="data-list">
            <li
              v-for="binding in bindings"
              :key="binding.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedBinding?.id === binding.id }]"
            >
              <div>
                <p class="data-row__title">{{ binding.name || `绑定 #${binding.id}` }}</p>
                <p class="data-row__meta">
                  {{ binding.node_name || `节点 ${binding.node_id ?? '-'}` }} ·
                  {{ binding.protocol || '未知协议' }}
                </p>
                <p class="data-row__meta">配置 ID {{ binding.protocol_config_id ?? '-' }}</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(binding.status)">{{ statusLabel(binding.status) }}</Badge>
                <Badge variant="outline">{{ statusLabel(binding.sync_status) }}</Badge>
                <Button variant="ghost" size="sm" type="button" @click="selectBinding(binding)">
                  详情
                </Button>
              </div>
            </li>
          </ul>
          <div v-if="bindingsPagination?.has_next" class="list-footer">
            <Button variant="ghost" type="button" @click="loadMoreBindings" :disabled="bindingsLoadingMore">
              {{ bindingsLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="cluster cluster--between cluster--start cluster--wide">
          <div>
            <CardTitle>绑定详情</CardTitle>
            <p class="panel-card__meta">
              {{ selectedBinding ? selectedBinding.name || `绑定 #${selectedBinding.id}` : '请选择绑定' }}
            </p>
          </div>
          <div v-if="selectedBinding" class="page-section__actions">
            <Button variant="secondary" type="button" :disabled="isSaving" @click="openEditBindingModal(selectedBinding)">
              编辑
            </Button>
            <Button variant="destructive" type="button" :disabled="isSaving" @click="openDeleteBindingModal(selectedBinding)">
              删除
            </Button>
            <Button type="button" :disabled="syncingBinding" @click="syncBinding">
              {{ syncingBinding ? '同步中...' : '同步' }}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p v-if="!selectedBinding" class="panel-card__empty">请选择协议绑定查看详情。</p>
          <div v-else>
            <div class="detail-grid">
              <div>
                <p class="detail-label">节点</p>
                <p class="detail-value">{{ selectedBinding.node_name || `节点 ${selectedBinding.node_id ?? '-'}` }}</p>
              </div>
              <div>
                <p class="detail-label">节点 ID</p>
                <p class="detail-value">{{ selectedBinding.node_id ?? '-' }}</p>
              </div>
              <div>
                <p class="detail-label">协议</p>
                <p class="detail-value">{{ selectedBinding.protocol || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">配置 ID</p>
                <p class="detail-value">{{ selectedBinding.protocol_config_id ?? '-' }}</p>
              </div>
              <div>
                <p class="detail-label">内核协议 ID</p>
                <p class="detail-value">{{ selectedBinding.kernel_id || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">角色</p>
                <p class="detail-value">{{ selectedBinding.role || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">状态</p>
                <p class="detail-value">{{ statusLabel(selectedBinding.status) }}</p>
              </div>
              <div>
                <p class="detail-label">同步状态</p>
                <p class="detail-value">{{ statusLabel(selectedBinding.sync_status) }}</p>
              </div>
              <div>
                <p class="detail-label">最近同步</p>
                <p class="detail-value">{{ formatDateTime(selectedBinding.last_synced_at) }}</p>
              </div>
              <div>
                <p class="detail-label">健康状态</p>
                <p class="detail-value">{{ selectedBinding.health_status || '-' }}</p>
              </div>
            </div>

            <div class="detail-section">
              <p class="detail-label">监听 / 连接 / 入口端口</p>
              <p class="detail-value">
                {{ selectedBinding.listen || '-' }} / {{ selectedBinding.connect || '-' }} /
                {{ selectedBinding.access_port ?? '-' }}
              </p>
            </div>

            <div v-if="selectedBinding.tags?.length" class="detail-section">
              <h4>标签</h4>
              <div class="cluster">
                <Badge v-for="tag in selectedBinding.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              </div>
            </div>

            <div v-if="selectedBinding.description" class="detail-section">
              <h4>描述</h4>
              <p class="detail-value">{{ selectedBinding.description }}</p>
            </div>

            <div class="detail-section">
              <h4>Metadata</h4>
              <p v-if="!selectedBindingMetadataPreview" class="detail-label">暂无配置</p>
              <pre v-else class="code-block">{{ selectedBindingMetadataPreview }}</pre>
            </div>

            <div v-if="selectedBinding.last_sync_error" class="detail-section">
              <h4>同步错误</h4>
              <p class="detail-value">{{ selectedBinding.last_sync_error }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCreateConfigModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建协议配置</DialogTitle>
          <DialogDescription>定义协议的基础模板与参数。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="config-name">配置名称 *</Label>
              <Input id="config-name" v-model="createConfigForm.name" type="text" placeholder="配置名称" />
            </div>
            <div class="stack stack--tight">
              <Label for="config-protocol">协议 *</Label>
              <Input id="config-protocol" v-model="createConfigForm.protocol" type="text" placeholder="例如 vless" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="config-status">状态</Label>
              <Select v-model="createConfigForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="createConfigTagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addTag(createConfigForm.tags, createConfigTagInput)"
              />
              <Button variant="secondary" type="button" @click="addTag(createConfigForm.tags, createConfigTagInput)">
                添加
              </Button>
            </div>
            <div v-if="createConfigForm.tags.length" class="cluster">
              <Badge v-for="tag in createConfigForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(createConfigForm.tags, tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="config-description">描述</Label>
            <Textarea
              id="config-description"
              v-model="createConfigForm.description"
              rows="2"
              placeholder="描述协议用途与限制"
            />
          </div>

          <div class="stack stack--tight">
            <Label>配置模板</Label>
            <div class="cluster">
              <Select v-model="createConfigTemplate">
                <SelectTrigger>
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="template in protocolConfigTemplates"
                    :key="template.id"
                    :value="template.id"
                  >
                    {{ template.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                type="button"
                :disabled="!createConfigTemplate"
                @click="applyConfigTemplate(createConfigTemplate, 'create')"
              >
                应用模板
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">应用模板会覆盖协议与 Profile 内容。</p>
          </div>

          <div class="stack stack--tight">
            <Label for="config-profile">Profile (JSON)</Label>
            <Textarea
              id="config-profile"
              v-model="createConfigProfileInput"
              rows="6"
              placeholder='{\n  "transport": "grpc",\n  "tls": true\n}'
            />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeConfigModals">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateConfig">
            {{ isSaving ? '创建中...' : '创建配置' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditConfigModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>编辑协议配置</DialogTitle>
          <DialogDescription>更新协议配置与参数。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="config-edit-name">配置名称 *</Label>
              <Input id="config-edit-name" v-model="editConfigForm.name" type="text" placeholder="配置名称" />
            </div>
            <div class="stack stack--tight">
              <Label for="config-edit-protocol">协议 *</Label>
              <Input id="config-edit-protocol" v-model="editConfigForm.protocol" type="text" placeholder="例如 vless" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="config-edit-status">状态</Label>
              <Select v-model="editConfigForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="editConfigTagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addTag(editConfigForm.tags, editConfigTagInput)"
              />
              <Button variant="secondary" type="button" @click="addTag(editConfigForm.tags, editConfigTagInput)">
                添加
              </Button>
            </div>
            <div v-if="editConfigForm.tags.length" class="cluster">
              <Badge v-for="tag in editConfigForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(editConfigForm.tags, tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="config-edit-description">描述</Label>
            <Textarea
              id="config-edit-description"
              v-model="editConfigForm.description"
              rows="2"
              placeholder="描述协议用途与限制"
            />
          </div>

          <div class="stack stack--tight">
            <Label>配置模板</Label>
            <div class="cluster">
              <Select v-model="editConfigTemplate">
                <SelectTrigger>
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="template in protocolConfigTemplates"
                    :key="template.id"
                    :value="template.id"
                  >
                    {{ template.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                type="button"
                :disabled="!editConfigTemplate"
                @click="applyConfigTemplate(editConfigTemplate, 'edit')"
              >
                应用模板
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">应用模板会覆盖协议与 Profile 内容。</p>
          </div>

          <div class="stack stack--tight">
            <Label for="config-edit-profile">Profile (JSON)</Label>
            <Textarea
              id="config-edit-profile"
              v-model="editConfigProfileInput"
              rows="6"
              placeholder='{\n  "transport": "grpc",\n  "tls": true\n}'
            />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeConfigModals">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateConfig">
            {{ isSaving ? '保存中...' : '保存修改' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteConfigModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除协议配置</DialogTitle>
          <DialogDescription>
            确认删除 {{ selectedConfig?.name || '该配置' }} 吗？删除后相关绑定将失效。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeDeleteConfigModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleDeleteConfig">
            {{ isSaving ? '处理中...' : '确认删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showCreateBindingModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建协议绑定</DialogTitle>
          <DialogDescription>将协议配置绑定到节点与角色。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-name">名称</Label>
              <Input id="binding-name" v-model="createBindingForm.name" type="text" placeholder="绑定名称" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-role">角色 *</Label>
              <Input id="binding-role" v-model="createBindingForm.role" type="text" placeholder="例如 edge" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-node">节点 ID *</Label>
              <Input id="binding-node" v-model.number="createBindingForm.node_id" type="number" placeholder="节点 ID" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-config">协议配置 ID *</Label>
              <Input
                id="binding-config"
                v-model.number="createBindingForm.protocol_config_id"
                type="number"
                placeholder="协议配置 ID"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-status">状态</Label>
              <Select v-model="createBindingForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">在线</SelectItem>
                  <SelectItem value="offline">离线</SelectItem>
                  <SelectItem value="maintenance">维护</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="stack stack--tight">
              <Label for="binding-kernel">内核协议 ID *</Label>
              <Input id="binding-kernel" v-model="createBindingForm.kernel_id" type="text" placeholder="kernel-id" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-listen">监听</Label>
              <Input id="binding-listen" v-model="createBindingForm.listen" type="text" placeholder="0.0.0.0:443" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-connect">连接</Label>
              <Input id="binding-connect" v-model="createBindingForm.connect" type="text" placeholder="127.0.0.1:10000" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-access-port">入口端口</Label>
              <Input
                id="binding-access-port"
                v-model.number="createBindingForm.access_port"
                type="number"
                min="0"
                placeholder="例如 443"
              />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="createBindingTagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addTag(createBindingForm.tags, createBindingTagInput)"
              />
              <Button variant="secondary" type="button" @click="addTag(createBindingForm.tags, createBindingTagInput)">
                添加
              </Button>
            </div>
            <div v-if="createBindingForm.tags.length" class="cluster">
              <Badge v-for="tag in createBindingForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(createBindingForm.tags, tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="binding-description">描述</Label>
            <Textarea
              id="binding-description"
              v-model="createBindingForm.description"
              rows="2"
              placeholder="描述绑定用途"
            />
          </div>

          <div class="stack stack--tight">
            <Label for="binding-metadata">Metadata (JSON)</Label>
            <Textarea
              id="binding-metadata"
              v-model="createBindingMetadataInput"
              rows="6"
              placeholder='{\n  "note": "example"\n}'
            />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeBindingModals">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateBinding">
            {{ isSaving ? '创建中...' : '创建绑定' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditBindingModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>编辑协议绑定</DialogTitle>
          <DialogDescription>更新绑定参数与目标节点。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-edit-name">名称</Label>
              <Input id="binding-edit-name" v-model="editBindingForm.name" type="text" placeholder="绑定名称" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-edit-role">角色 *</Label>
              <Input id="binding-edit-role" v-model="editBindingForm.role" type="text" placeholder="例如 edge" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-edit-node">节点 ID *</Label>
              <Input id="binding-edit-node" v-model.number="editBindingForm.node_id" type="number" placeholder="节点 ID" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-edit-config">协议配置 ID *</Label>
              <Input
                id="binding-edit-config"
                v-model.number="editBindingForm.protocol_config_id"
                type="number"
                placeholder="协议配置 ID"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-edit-status">状态</Label>
              <Select v-model="editBindingForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">在线</SelectItem>
                  <SelectItem value="offline">离线</SelectItem>
                  <SelectItem value="maintenance">维护</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="stack stack--tight">
              <Label for="binding-edit-kernel">内核协议 ID *</Label>
              <Input id="binding-edit-kernel" v-model="editBindingForm.kernel_id" type="text" placeholder="kernel-id" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-edit-listen">监听</Label>
              <Input id="binding-edit-listen" v-model="editBindingForm.listen" type="text" placeholder="0.0.0.0:443" />
            </div>
            <div class="stack stack--tight">
              <Label for="binding-edit-connect">连接</Label>
              <Input id="binding-edit-connect" v-model="editBindingForm.connect" type="text" placeholder="127.0.0.1:10000" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="binding-edit-access-port">入口端口</Label>
              <Input
                id="binding-edit-access-port"
                v-model.number="editBindingForm.access_port"
                type="number"
                min="0"
                placeholder="例如 443"
              />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="editBindingTagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addTag(editBindingForm.tags, editBindingTagInput)"
              />
              <Button variant="secondary" type="button" @click="addTag(editBindingForm.tags, editBindingTagInput)">
                添加
              </Button>
            </div>
            <div v-if="editBindingForm.tags.length" class="cluster">
              <Badge v-for="tag in editBindingForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(editBindingForm.tags, tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="binding-edit-description">描述</Label>
            <Textarea
              id="binding-edit-description"
              v-model="editBindingForm.description"
              rows="2"
              placeholder="描述绑定用途"
            />
          </div>

          <div class="stack stack--tight">
            <Label for="binding-edit-metadata">Metadata (JSON)</Label>
            <Textarea
              id="binding-edit-metadata"
              v-model="editBindingMetadataInput"
              rows="6"
              placeholder='{\n  "note": "example"\n}'
            />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeBindingModals">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateBinding">
            {{ isSaving ? '保存中...' : '保存修改' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteBindingModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除协议绑定</DialogTitle>
          <DialogDescription>
            确认删除绑定 {{ selectedBinding?.id || '' }} 吗？删除后节点将移除该协议绑定。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeDeleteBindingModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleDeleteBinding">
            {{ isSaving ? '处理中...' : '确认删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
