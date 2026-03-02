#!/usr/bin/env node

/**
 * GitLab 调试测试 - 专门测试 MR #11
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function debugMR() {
    console.log("=== GitLab MR #11 调试测试 ===\n");

    const projectPath = "10jqka/cloud-software/f10/thsc-f10-biz";
    const mrIid = 11;

    // 创建连接
    const transport = new StreamableHTTPClientTransport(new URL("http://10.10.4.161:12306/mcp"));
    const client = new Client(
        { name: "debug-client", version: "1.0.0" },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("✅ MCP 连接成功\n");

        // 测试 1: 先确认项目 ID
        console.log("📋 步骤 1: 获取项目信息...");
        const projectResult = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}`
            }
        });

        if (projectResult.isError) {
            console.error("❌ 获取项目失败:", projectResult.content[0].text);
            await client.close();
            return;
        }

        console.log("✅ 项目存在");
        // 尝试从响应中解析项目 ID
        const projectText = projectResult.content[0].text;
        const idMatch = projectText.match(/"id":\s*(\d+)/);
        if (idMatch) {
            console.log(`   项目 ID: ${idMatch[1]}`);
        }
        console.log("");

        // 测试 2: 先获取所有 MR 列表，看看是否有 #11
        console.log("📋 步骤 2: 获取所有 MR 列表...");
        const mrsResult = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests`,
                params: {
                    state: "all",
                    per_page: 20
                }
            }
        });

        if (mrsResult.isError) {
            console.error("❌ 获取 MR 列表失败:", mrsResult.content[0].text);
        } else {
            console.log("✅ 获取 MR 列表成功");
            const mrsText = mrsResult.content[0].text;
            // 尝试查找 MR #11
            if (mrsText.includes('"iid": 11') || mrsText.includes('"iid":11')) {
                console.log("   ✅ 找到 MR #11");
            } else {
                console.log("   ⚠️  MR 列表中没有找到 #11");
                console.log("\n   可用的 MR IID:");
                const iidMatches = mrsText.matchAll(/"iid":\s*(\d+)/g);
                for (const match of iidMatches) {
                    console.log(`   - MR #${match[1]}`);
                }
            }
        }
        console.log("");

        // 测试 3: 尝试获取 MR #11（使用项目路径）
        console.log("📋 步骤 3: 尝试获取 MR #11（使用项目路径）...");
        console.log(`   URL: /api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrIid}`);

        const mr1Result = await client.callTool({
            name: "gitlab_request",
            arguments: {
                method: "GET",
                path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrIid}/changes?access_raw_diffs=true`
            }
        });

        if (mr1Result.isError) {
            console.error("❌ 失败:", mr1Result.content[0].text);
        } else {
            console.log("✅ 成功!");
            const mrText = mr1Result.content[0].text;
            console.log("\n响应（前 20 行）:");
            mrText.split('\n').slice(0, 20).forEach(line => console.log(`  ${line}`));
        }
        console.log("");

        // 测试 4: 如果有项目 ID，尝试用数字 ID
        if (idMatch) {
            const projectId = idMatch[1];
            console.log(`📋 步骤 4: 尝试获取 MR #11（使用项目 ID ${projectId}）...`);
            console.log(`   URL: /api/v4/projects/${projectId}/merge_requests/${mrIid}`);

            const mr2Result = await client.callTool({
                name: "gitlab_request",
                arguments: {
                    method: "GET",
                    path: `/api/v4/projects/${projectId}/merge_requests/${mrIid}`
                }
            });

            if (mr2Result.isError) {
                console.error("❌ 失败:", mr2Result.content[0].text);
            } else {
                console.log("✅ 成功!");
            }
        }

        await client.close();

    } catch (error) {
        console.error("\n❌ 错误:", error.message);
        console.error(error.stack);
    }
}

debugMR();
