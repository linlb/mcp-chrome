#!/usr/bin/env node

/**
 * 远程 GitLab MCP 测试
 * 在 10.10.4.161 上运行此脚本
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function testGitLab() {
    console.log("=== GitLab MCP Proxy 测试 ===\n");

    // 注意：StreamableHTTPClientTransport 接受的是 URL 对象或字符串
    const transport = new StreamableHTTPClientTransport(
        new URL("http://10.10.4.161:12306/mcp")
    );

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        console.log("🔗 连接到 MCP 服务器...");
        await client.connect(transport);
        console.log("✅ MCP 连接成功\n");

        // 列出所有工具
        console.log("📋 列出所有可用工具...");
        const toolsList = await client.listTools();
        const gitlabTool = toolsList.tools.find(t => t.name === "gitlab_request");

        if (!gitlabTool) {
            console.error("❌ 未找到 gitlab_request 工具");
            console.log("\n可用的工具（前10个）:");
            toolsList.tools.slice(0, 10).forEach(t => {
                console.log(`   - ${t.name}`);
            });
            process.exit(1);
        }

        console.log("✅ 找到 gitlab_request 工具");
        console.log(`   总工具数: ${toolsList.tools.length}\n`);

        // 测试 1: 获取项目信息
        console.log("🏢 测试 1: 获取 GitLab 项目信息...");
        const projectPath = "10jqka/cloud-software/f10/thsc-f10-biz";

        const projectResult = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}`
            }
        });

        if (projectResult.isError) {
            console.error("❌ 调用失败:");
            console.error(projectResult.content[0].text);
        } else {
            console.log("✅ 成功获取项目信息");
            const text = projectResult.content[0].text;
            const lines = text.split('\n');
            console.log("\n" + lines.slice(0, 15).join('\n'));
            if (lines.length > 15) {
                console.log(`... 还有 ${lines.length - 15} 行`);
            }
        }
        console.log("");

        // 测试 2: 获取 MR 信息
        console.log("📝 测试 2: 获取 MR #11 信息...");

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
            const mrLines = mrText.split('\n');
            console.log("\n" + mrLines.slice(0, 15).join('\n'));
            if (mrLines.length > 15) {
                console.log(`... 还有 ${mrLines.length - 15} 行`);
            }
        }
        console.log("");

        // 测试 3: 获取 MR Changes
        console.log("📂 测试 3: 获取 MR Changes (diff)...");

        const changesResult = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/11/changes`
            }
        });

        if (changesResult.isError) {
            console.error("❌ 调用失败:");
            console.error(changesResult.content[0].text);
        } else {
            console.log("✅ 成功获取 MR Changes");
            const changesText = changesResult.content[0].text;
            const changesLines = changesText.split('\n');
            console.log("\n" + changesLines.slice(0, 20).join('\n'));
            if (changesLines.length > 20) {
                console.log(`... 还有 ${changesLines.length - 20} 行`);
            }
        }
        console.log("");

        console.log("🎉 所有测试完成！");
        console.log("\n✅ GitLab 代理服务工作正常！");
        console.log("你现在可以在 Claude Code 中使用 gitlab_request 工具了。");

        await client.close();

    } catch (error) {
        console.error("\n❌ 测试失败:", error.message);
        if (error.stack) {
            console.error("\n错误堆栈:");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// 运行测试
testGitLab().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
