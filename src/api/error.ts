export function parseErrorMessage(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: string; error?: string };
    if (parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch (error) {
    return trimmed;
  }

  return trimmed;
}

export async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  return parseErrorMessage(text, fallback);
}

export function errorTitleForStatus(status: number): string {
  if (status === 401) {
    return '登录已失效';
  }
  if (status === 403) {
    return '无权限访问';
  }
  if (status === 404) {
    return '资源不存在';
  }
  if (status === 409) {
    return '状态冲突';
  }
  if (status === 429) {
    return '请求过于频繁';
  }
  if (status >= 500) {
    return '服务异常';
  }
  if (status >= 400) {
    return '请求失败';
  }
  return '操作失败';
}

export function errorFallbackForStatus(status: number): string {
  if (status === 400 || status === 422) {
    return '请求参数有误，请检查填写内容后重试。';
  }
  if (status === 401) {
    return '登录已失效，请重新登录后再试。';
  }
  if (status === 403) {
    return '暂无权限访问，请联系管理员。';
  }
  if (status === 404) {
    return '请求的资源不存在或已删除。';
  }
  if (status === 409) {
    return '数据状态已更新，请刷新后重试。';
  }
  if (status === 429) {
    return '操作过于频繁，请稍后再试。';
  }
  if (status >= 500) {
    return '服务暂时不可用，请稍后再试。';
  }
  return '请求失败，请稍后再试。';
}
