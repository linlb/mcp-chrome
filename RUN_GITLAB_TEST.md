# 运行 GitLab 代理测试

## 在 10.10.4.161 上运行

### 方法 1: 直接运行（推荐）

```bash
# SSH 到服务器
ssh user@10.10.4.161

# 进入项目目录
cd /path/to/mcp-chrome/app/native-server

# 运行测试
node test-remote-gitlab.js
```

### 方法 2: 从当前机器远程执行

```bash
# 复制测试文件到服务器
scp app/native-server/test-remote-gitlab.js user@10.10.4.161:/tmp/

# SSH 执行
ssh user@10.10.4.161 'cd /tmp && node test-remote-gitlab.js'
```

### 方法 3: 使用项目中的 node

```bash
ssh user@10.10.4.161
cd /path/to/mcp-chrome/app/native-server
npx ts-node test-remote-gitlab.js
```

## 期望的输出

如果一切正常，你会看到：

```
=== GitLab MCP Proxy 测试 ===

🔗 连接到 MCP 服务器...
✅ MCP 连接成功

📋 列出所有可用工具...
✅ 找到 gitlab_request 工具
   总工具数: XX

🏢 测试 1: 获取 GitLab 项目信息...
✅ 成功获取项目信息

GitLab API Response (200):

Response Data:
{
  "id": 12345,
  "name": "thsc-f10-biz",
  ...
}

📝 测试 2: 获取 MR #11 信息...
✅ 成功获取 MR 信息

GitLab API Response (200):

Response Data:
{
  "id": ...,
  "title": "...",
  "state": "opened",
  ...
}

📂 测试 3: 获取 MR Changes (diff)...
✅ 成功获取 MR Changes

🎉 所有测试完成！

✅ GitLab 代理服务工作正常！
```

## 常见错误

### 错误 1: 未找到 gitlab_request 工具

**原因**: 代码未更新或未编译

**解决**:
```bash
cd /path/to/mcp-chrome
cd packages/shared && npm run build
cd ../../app/native-server && npm run build
pm2 restart mcp-chrome-bridge  # 或 npm start
```

### 错误 2: GitLab is not configured

**原因**: gitlab-config.json 不存在

**解决**:
```bash
cd /path/to/mcp-chrome/app/native-server
cat > gitlab-config.json <<EOF
{
  "baseUrl": "http://gitlab-outer.wttiao.com",
  "privateToken": "BsSwf7ze8b5jaxxp_NNz",
  "timeout": 30000
}
EOF
```

### 错误 3: 401 Unauthorized

**原因**: Token 无效或过期

**解决**: 检查并更新 gitlab-config.json 中的 privateToken

### 错误 4: 连接超时

**原因**: 网络问题或 GitLab 服务不可达

**解决**: 在服务器上测试能否访问 GitLab
```bash
curl -I http://gitlab-outer.wttiao.com
```
