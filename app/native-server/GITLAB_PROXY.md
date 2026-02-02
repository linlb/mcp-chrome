# GitLab API 代理使用指南

## 功能说明

这个功能将 native-server 作为内网 GitLab 的 API 代理，让其他无法直接访问内网 GitLab 的机器可以通过 MCP 协议访问 GitLab API。

## 配置步骤

### 1. 创建配置文件

在 `app/native-server/` 目录下创建 `gitlab-config.json`：

```bash
cd app/native-server
cp gitlab-config.example.json gitlab-config.json
```

### 2. 编辑配置

修改 `gitlab-config.json`，填入你的 GitLab 信息：

```json
{
  "baseUrl": "https://gitlab.your-company.com",
  "privateToken": "glpat-xxxxxxxxxxxxxxxxxxxx",
  "timeout": 30000
}
```

**参数说明**：

- `baseUrl`: GitLab 服务器地址（不要带尾部斜杠）
- `privateToken`: GitLab Private Access Token（需要有相应的 API 权限）
- `timeout`: 请求超时时间（毫秒），默认 30000

### 3. 获取 GitLab Token

1. 登录你的 GitLab
2. 点击右上角头像 → Settings → Access Tokens
3. 创建一个 Token，选择需要的权限（例如：`api`, `read_api`, `read_repository`）
4. 复制生成的 Token 到配置文件中

### 4. 重启服务

```bash
npm run build
# 或者如果是开发模式
npm run dev
```

## 使用 MCP Tool

配置完成后，会自动注册一个名为 `gitlab_request` 的 MCP Tool。

### Tool 参数

```typescript
{
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,           // API 路径，例如 '/api/v4/projects'
  body?: object,          // 请求体（用于 POST/PUT/PATCH）
  params?: object,        // URL 查询参数
  headers?: object        // 额外的 HTTP 头（可选）
}
```

### 使用示例

#### 1. 获取项目列表

```json
{
  "method": "GET",
  "path": "/api/v4/projects",
  "params": {
    "membership": true,
    "per_page": 20
  }
}
```

#### 2. 获取 Merge Request 列表

```json
{
  "method": "GET",
  "path": "/api/v4/projects/123/merge_requests",
  "params": {
    "state": "opened",
    "per_page": 10
  }
}
```

#### 3. 获取 MR 详情和 Diff

```json
{
  "method": "GET",
  "path": "/api/v4/projects/123/merge_requests/456/changes"
}
```

#### 4. 添加 MR 评论

```json
{
  "method": "POST",
  "path": "/api/v4/projects/123/merge_requests/456/notes",
  "body": {
    "body": "LGTM! 代码看起来不错"
  }
}
```

#### 5. 批准 MR

```json
{
  "method": "POST",
  "path": "/api/v4/projects/123/merge_requests/456/approve"
}
```

#### 6. 合并 MR

```json
{
  "method": "PUT",
  "path": "/api/v4/projects/123/merge_requests/456/merge",
  "body": {
    "merge_commit_message": "Merge branch 'feature' into 'main'",
    "should_remove_source_branch": true
  }
}
```

## 创建自定义 Skill

你可以基于 `gitlab_request` 创建更友好的 Skill，例如：

### 示例：review-mr Skill

创建 `~/.claude/skills/review-mr.md`：

```markdown
---
name: review-mr
description: 审查 GitLab Merge Request
tags: [gitlab, review]
---

# 审查 GitLab MR

使用 gitlab_request 工具获取 MR 的详细信息和 diff，然后进行代码审查。

## 使用方法

当用户提供 GitLab MR URL 时：

1. 从 URL 中提取 project_id 和 mr_iid
2. 调用 gitlab_request 获取 MR 基本信息
3. 调用 gitlab_request 获取 MR changes (diff)
4. 分析代码变更，给出审查意见
5. 可选：调用 gitlab_request 添加评论

## 示例

URL: https://gitlab.example.com/group/project/-/merge_requests/123

提取参数:

- project_id: "group/project" 或 "group%2Fproject"（URL 编码）
- mr_iid: 123

调用 API:

1. GET /api/v4/projects/group%2Fproject/merge_requests/123
2. GET /api/v4/projects/group%2Fproject/merge_requests/123/changes
```

## 注意事项

### 1. 安全性

- ⚠️ **配置文件包含敏感信息**，已自动加入 `.gitignore`，不要提交到版本控制
- ⚠️ **Token 权限**：根据需要授予最小权限，避免使用 admin token
- ⚠️ **审计日志**：所有 API 请求都会在服务端留下日志

### 2. 项目 ID vs IID

GitLab API 中：

- **Project ID**：项目的数字 ID 或 URL 编码的路径（如 `group%2Fproject`）
- **MR IID**：Merge Request 的内部 ID（显示在 URL 中的数字）
- **MR ID**：Merge Request 的全局 ID（通常不使用）

### 3. API 限流

GitLab 有 API 请求限流：

- 默认每分钟 600 次请求
- 超过限制会返回 429 错误
- 可以从响应头 `RateLimit-*` 中查看限流信息

### 4. 分页

获取列表时建议使用分页参数：

- `per_page`: 每页数量（默认 20，最大 100）
- `page`: 页码（从 1 开始）

响应头会包含：

- `X-Total`: 总记录数
- `X-Total-Pages`: 总页数
- `X-Page`: 当前页
- `X-Per-Page`: 每页数量

## 常用 API 参考

完整 API 文档：https://docs.gitlab.com/ee/api/api_resources.html

### 项目相关

- `GET /api/v4/projects` - 列出所有项目
- `GET /api/v4/projects/:id` - 获取项目详情
- `GET /api/v4/projects/:id/repository/tree` - 获取仓库文件树

### Merge Request

- `GET /api/v4/projects/:id/merge_requests` - 列出 MR
- `GET /api/v4/projects/:id/merge_requests/:mr_iid` - 获取 MR 详情
- `GET /api/v4/projects/:id/merge_requests/:mr_iid/changes` - 获取 MR diff
- `GET /api/v4/projects/:id/merge_requests/:mr_iid/discussions` - 获取讨论
- `POST /api/v4/projects/:id/merge_requests/:mr_iid/notes` - 添加评论
- `POST /api/v4/projects/:id/merge_requests/:mr_iid/approve` - 批准 MR
- `PUT /api/v4/projects/:id/merge_requests/:mr_iid/merge` - 合并 MR

### Issues

- `GET /api/v4/projects/:id/issues` - 列出 Issues
- `GET /api/v4/projects/:id/issues/:issue_iid` - 获取 Issue 详情
- `POST /api/v4/projects/:id/issues` - 创建 Issue

### Commits

- `GET /api/v4/projects/:id/repository/commits` - 列出提交
- `GET /api/v4/projects/:id/repository/commits/:sha` - 获取提交详情
- `GET /api/v4/projects/:id/repository/commits/:sha/diff` - 获取提交 diff

## 故障排查

### 问题：工具不可用

```
Error: GitLab is not configured
```

**解决**：检查 `gitlab-config.json` 是否存在且格式正确

### 问题：401 Unauthorized

```
GitLab request failed: 401 Unauthorized
```

**解决**：

1. 检查 Token 是否正确
2. 检查 Token 是否过期
3. 检查 Token 权限是否足够

### 问题：404 Not Found

```
GitLab request failed: 404 Not Found
```

**解决**：

1. 检查 API 路径是否正确
2. 检查 project ID 是否正确（尝试 URL 编码）
3. 检查是否有权限访问该资源

### 问题：超时

```
GitLab request failed: timeout
```

**解决**：

1. 检查网络连接
2. 检查 GitLab 服务是否正常
3. 增加 `timeout` 配置值

## 完整工作流示例

### 代码审查流程

1. 用户提供 MR URL
2. Skill 解析 URL，提取参数
3. 获取 MR 基本信息（标题、描述、状态等）
4. 获取 MR changes（代码 diff）
5. 分析代码变更
6. 给出审查意见
7. （可选）添加评论到 GitLab

这个流程完全可以通过 `gitlab_request` 工具 + 自定义 Skill 实现！
