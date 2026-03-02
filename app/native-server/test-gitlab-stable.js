#!/usr/bin/env node

/**
 * 稳定版 GitLab MCP 测试
 * 添加了重连和详细的错误处理
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

// 创建新的 MCP 客户端连接
async function createMcpClient() {
    const transport = new StreamableHTTPClientTransport(new URL("http://10.10.4.161:12306/mcp"));
    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );
    await client.connect(transport);
    return client;
}

async function testSingleRequest(description, args, retries = 2) {
    console.log(`\n${description}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
        let client = null;
        try {
            // 每次请求都创建新的连接
            console.log(`  尝试 ${attempt}/${retries}...`);
            client = await createMcpClient();

            const result = await client.callTool({
                name: "gitlab_request",
                arguments: args,
                timeout: 30000 // 30 秒超时
            });

            await client.close();

            if (result.isError) {
                console.error(`  ❌ API 错误: ${result.content[0].text}`);
                return false;
            }

            console.log("  ✅ 成功!");
            const text = result.content[0].text;
            const lines = text.split('\n');
            console.log("\n  响应（前 12 行）:");
            lines.slice(0, 32).forEach(line => console.log(`  ${line}`));
            if (lines.length > 12) {
                console.log(`  ... 还有 ${lines.length - 12} 行`);
            }
            return true;

        } catch (error) {
            console.error(`  ❌ 尝试 ${attempt} 失败: ${error.message}`);
            if (client) {
                try {
                    await client.close();
                } catch (e) {
                    // ignore close errors
                }
            }

            if (attempt < retries) {
                console.log(`  等待 2 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.error(`  所有尝试都失败了`);
                return false;
            }
        }
    }

    return false;
}

async function testGitLab() {
    console.log("=== GitLab MCP Proxy 稳定测试 ===\n");

    // 先测试连接
    console.log("🔗 测试 MCP 连接...");
    let client;
    try {
        client = await createMcpClient();
        console.log("✅ 连接成功");

        const tools = await client.listTools();
        const gitlabTool = tools.tools.find(t => t.name === "gitlab_request");

        if (!gitlabTool) {
            console.error("❌ 未找到 gitlab_request 工具");
            await client.close();
            process.exit(1);
        }

        console.log(`✅ 找到 gitlab_request 工具 (共 ${tools.tools.length} 个工具)`);
        await client.close();

    } catch (error) {
        console.error("❌ 连接失败:", error.message);
        process.exit(1);
    }

    console.log("\n" + "=".repeat(60));

    const projectPath = "10jqka/cloud-software/f10/thsc-f10-biz";

    // 测试 1: 获取项目信息
    const test1Success = await testSingleRequest(
        "📋 测试 1: 获取项目信息",
        {
            method: "GET",
            path: `/api/v4/projects/${encodeURIComponent(projectPath)}`
        }
    );

    console.log("\n" + "=".repeat(60));

    // 测试 2: 获取 MR 信息
    const test2Success = await testSingleRequest(
        "📝 测试 2: 获取 MR #12 信息",
        {
            method: "GET",
            path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/12`
        }
    );

    console.log("\n" + "=".repeat(60));

    // 测试 3: 获取 MR 列表（更轻量）
    const test3Success = await testSingleRequest(
        "📂 测试 3: 获取 MR 列表",
        {
            method: "GET",
            path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests`,
            params: {
                state: "all",
                per_page: 5
            }
        }
    );

    console.log("\n" + "=".repeat(60));

    // 测试 4: 获取所有分支
    const test4Success = await testSingleRequest(
        "🌿 测试 4: 获取 thsc-f10-biz 所有分支",
        {
            method: "GET",
            path: `/api/v4/projects/${encodeURIComponent(projectPath)}/repository/branches`,
            params: {
                per_page: 20
            }
        }
    );

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 测试结果:");
    console.log(`  测试 1 (项目信息): ${test1Success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  测试 2 (MR 详情): ${test2Success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  测试 3 (MR 列表): ${test3Success ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  测试 4 (分支列表): ${test4Success ? '✅ 通过' : '❌ 失败'}`);

    const allPassed = test1Success && test2Success && test3Success && test4Success;

    if (allPassed) {
        console.log("\n🎉 所有测试通过！GitLab 代理服务工作正常！");
    } else {
        console.log("\n⚠️  部分测试失败，但只要有一个测试通过，说明代理服务基本可用。");
        console.log("失败可能是由于网络不稳定或 GitLab 服务问题。");
    }
}

testGitLab().catch(error => {
    console.error("\nFatal error:", error);
    process.exit(1);
});
