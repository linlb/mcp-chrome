# 部署 GitLab Proxy 修复

## 问题说明

修复了 `node-fetch v2` 的 timeout 处理问题。之前的 `timeout` 参数不起作用，导致第二次请求可能卡住。

## 部署步骤（在 10.10.4.161 上执行）

### 1. 更新代码

```bash
# 进入项目目录
cd /path/to/mcp-chrome

# 拉取最新代码
git pull

# 或者手动复制修复后的文件
# scp app/native-server/src/gitlab/client.ts user@10.10.4.161:/path/to/mcp-chrome/app/native-server/src/gitlab/
```

### 2. 重新编译

```bash
# 编译 native-server
cd app/native-server
npm run build
```

### 3. 重启服务

```bash
# 如果使用 pm2
pm2 restart mcp-chrome-bridge

# 或者直接重启
npm start
```

### 4. 验证修复

```bash
# 运行稳定测试
node test-gitlab-stable.js
```

## 期望结果

所有测试都应该通过：

```
📊 测试结果:
  测试 1 (项目信息): ✅ 通过
  测试 2 (MR 详情): ✅ 通过
  测试 3 (MR 列表): ✅ 通过

🎉 所有测试通过！GitLab 代理服务工作正常！
```

## 如果还有问题

### 检查编译是否成功

```bash
ls -la dist/gitlab/client.js
# 应该看到最新时间戳的文件
```

### 检查服务日志

```bash
# 如果使用 pm2
pm2 logs mcp-chrome-bridge

# 查看最近的错误
pm2 logs mcp-chrome-bridge --err --lines 50
```

### 手动测试 GitLab 连接

```bash
# 测试能否直接访问 GitLab
curl -H "PRIVATE-TOKEN: BsSwf7ze8b5jaxxp_NNz" \
  "http://gitlab-outer.myhexin.com/api/v4/projects/10jqka%2Fcloud-software%2Ff10%2Fthsc-f10-biz/merge_requests/11"
```

如果 curl 能正常返回数据，说明 GitLab 配置是对的。
