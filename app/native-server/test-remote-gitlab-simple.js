#!/usr/bin/env node

/**
 * 简化版远程 GitLab MCP 测试
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function testGitLab() {
    console.log("=== GitLab MCP Proxy 测试（简化版）===\n");

    try {
        // 尝试不同的 URL 传递方式
        let transport;
        try {
            transport = new StreamableHTTPClientTransport(new URL("http://localhost:12306/mcp"));
        } catch (e) {
            console.log("尝试方式 1 失败，切换到方式 2...");
            transport = new StreamableHTTPClientTransport("http://localhost:12306/mcp");
        }

        const client = new Client(
            { name: "test-client", version: "1.0.0" },
            { capabilities: {} }
        );

        console.log("🔗 连接到 MCP 服务器...");
        await client.connect(transport);
        console.log("✅ MCP 连接成功\n");

        // 列出工具
        console.log("📋 列出工具...");
        const tools = await client.listTools();
        const gitlabTool = tools.tools.find(t => t.name === "gitlab_request");

        if (!gitlabTool) {
            console.error("❌ 未找到 gitlab_request 工具");
            console.log("可用工具:", tools.tools.map(t => t.name).slice(0, 10));
            await client.close();
            process.exit(1);
        }

        console.log("✅ 找到 gitlab_request 工具\n");

        // 测试调用
        console.log("🏢 测试: 获取项目信息...");
        const result = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: "/api/v4/projects/10jqka%2Fcloud-software%2Ff10%2Fthsc-f10-biz"
            }
        });

        if (result.isError) {
            console.error("❌ 失败:", result.content[0].text);
        } else {
            console.log("✅ 成功!");
            console.log("\n响应（前10行）:");
            console.log(result.content[0].text.split('\n').slice(0, 10).join('\n'));
        }

        await client.close();
        console.log("\n🎉 测试完成！");

    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testGitLab();
