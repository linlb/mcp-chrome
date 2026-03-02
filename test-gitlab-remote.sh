#!/bin/bash

# GitLab MCP Proxy 测试脚本
# 在 10.10.4.161 上运行

echo "=== GitLab MCP Proxy 测试 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="http://10.10.4.161:12306"

# 测试 1: 服务健康检查
echo "📋 测试 1: 服务健康检查..."
PING_RESULT=$(curl -s -X GET "${SERVER}/ping")
if echo "$PING_RESULT" | grep -q "pong"; then
    echo -e "${GREEN}✅ 服务正常运行${NC}"
else
    echo -e "${RED}❌ 服务异常${NC}"
    exit 1
fi
echo ""

# 测试 2: 创建临时测试脚本
echo "📋 测试 2: 准备 MCP 测试脚本..."

cat > /tmp/test-gitlab-mcp.js << 'EOFJS'
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function testGitLab() {
    console.log("🔗 连接到 MCP 服务器...");

    const transport = new StreamableHTTPClientTransport({
        url: "http://10.10.4.161:12306/mcp"
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log("✅ MCP 连接成功\n");

        // 列出所有工具
        console.log("📋 列出所有可用工具...");
        const toolsList = await client.listTools();
        const gitlabTool = toolsList.tools.find(t => t.name === "gitlab_request");

        if (!gitlabTool) {
            console.error("❌ 未找到 gitlab_request 工具");
            console.log("\n可用的工具:");
            toolsList.tools.slice(0, 10).forEach(t => {
                console.log(`   - ${t.name}`);
            });
            process.exit(1);
        }

        console.log("✅ 找到 gitlab_request 工具\n");

        // 测试获取项目信息
        console.log("🏢 测试: 获取 GitLab 项目信息...");
        const projectPath = "10jqka/cloud-software/f10/thsc-f10-biz";
        const result = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}`
            }
        });

        if (result.isError) {
            console.error("❌ 调用失败:");
            console.error(result.content[0].text);
            process.exit(1);
        }

        console.log("✅ 成功获取项目信息");
        const text = result.content[0].text;
        console.log("\n响应内容:");
        console.log(text.split('\n').slice(0, 15).join('\n'));
        console.log("");

        // 测试获取 MR 信息
        console.log("📝 测试: 获取 MR 信息...");
        const mrResult = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/11`
            }
        });

        if (mrResult.isError) {
            console.error("❌ 调用失败:");
            console.error(mrResult.content[0].text);
        } else {
            console.log("✅ 成功获取 MR 信息");
            const mrText = mrResult.content[0].text;
            console.log("\n响应内容:");
            console.log(mrText.split('\n').slice(0, 15).join('\n'));
        }

        console.log("\n🎉 所有测试完成！");
        await client.close();

    } catch (error) {
        console.error("❌ 测试失败:", error.message);
        process.exit(1);
    }
}

testGitLab();
EOFJS

echo -e "${GREEN}✅ 测试脚本已创建${NC}"
echo ""

# 测试 3: 运行 Node.js 测试
echo "📋 测试 3: 执行 MCP 协议测试..."
echo -e "${YELLOW}注意: 需要在 10.10.4.161 上运行以下命令:${NC}"
echo ""
echo -e "${YELLOW}cd /tmp && node test-gitlab-mcp.js${NC}"
echo ""
echo "或者运行:"
echo -e "${YELLOW}ssh user@10.10.4.161 'cd /tmp && node test-gitlab-mcp.js'${NC}"
