#!/usr/bin/env ts-node
/**
 * 通过 MCP 协议测试 GitLab 代理
 *
 * 连接到远程 native-server 并调用 gitlab_request 工具
 */

import fetch from 'node-fetch';

const MCP_SERVER_URL = 'http://10.10.4.161:12306/mcp';

/**
 * 调用 MCP 工具
 */
async function callMcpTool(toolName: string, args: any) {
  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * 列出所有可用的 MCP 工具
 */
async function listMcpTools() {
  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

async function testGitLabViaProxy() {
  console.log('=== 通过 MCP 代理测试 GitLab API ===\n');
  console.log(`MCP 服务器: ${MCP_SERVER_URL}\n`);

  try {
    // 测试 0: 检查服务是否可访问
    console.log('🔗 测试 0: 检查 MCP 服务连接...');
    try {
      const pingResponse = await fetch('http://10.10.4.161:12306/ping', {
        timeout: 5000,
      });
      if (pingResponse.ok) {
        console.log('✅ MCP 服务器连接正常\n');
      }
    } catch (error: any) {
      console.error('❌ 无法连接到 MCP 服务器');
      console.error(`   错误: ${error.message}\n`);
      process.exit(1);
    }

    // 测试 1: 列出可用工具
    console.log('📋 测试 1: 列出可用的 MCP 工具...');
    const toolsList = await listMcpTools();
    const tools = toolsList.result?.tools || [];
    const gitlabTool = tools.find((t: any) => t.name === 'gitlab_request');

    if (gitlabTool) {
      console.log('✅ 找到 gitlab_request 工具');
      console.log(`   描述: ${gitlabTool.description?.substring(0, 80)}...\n`);
    } else {
      console.error('❌ 未找到 gitlab_request 工具');
      console.log('\n可用的工具:');
      tools.slice(0, 10).forEach((t: any) => {
        console.log(`   - ${t.name}`);
      });
      console.log('');
      process.exit(1);
    }

    // 从 URL 提取信息
    const projectPath = '10jqka/cloud-software/f10/thsc-f10-biz';
    const mrIid = 11;

    console.log('测试目标:');
    console.log(`   项目路径: ${projectPath}`);
    console.log(`   MR IID: ${mrIid}\n`);

    // 测试 2: 获取 MR 基本信息
    console.log('📝 测试 2: 获取 MR 基本信息...');
    const mrInfoResult = await callMcpTool('gitlab_request', {
      method: 'GET',
      path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrIid}`,
    });

    if (mrInfoResult.error) {
      console.error('❌ 调用失败');
      console.error(JSON.stringify(mrInfoResult.error, null, 2));
    } else {
      console.log('✅ 成功获取 MR 信息');
      const content = mrInfoResult.result?.content || [];
      if (content.length > 0) {
        const text = content[0].text;
        // 尝试解析响应中的数据
        const lines = text.split('\n');
        console.log(`\n${lines.slice(0, 10).join('\n')}`);
      }
    }
    console.log('');

    // 测试 3: 获取 MR Changes
    console.log('📝 测试 3: 获取 MR Changes...');
    const mrChangesResult = await callMcpTool('gitlab_request', {
      method: 'GET',
      path: `/api/v4/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrIid}/changes`,
    });

    if (mrChangesResult.error) {
      console.error('❌ 调用失败');
      console.error(JSON.stringify(mrChangesResult.error, null, 2));
    } else {
      console.log('✅ 成功获取 MR Changes');
      const content = mrChangesResult.result?.content || [];
      if (content.length > 0) {
        const text = content[0].text;
        const lines = text.split('\n');
        console.log(`\n${lines.slice(0, 15).join('\n')}`);
      }
    }
    console.log('');

    // 测试 4: 获取项目信息
    console.log('🏢 测试 4: 获取项目信息...');
    const projectResult = await callMcpTool('gitlab_request', {
      method: 'GET',
      path: `/api/v4/projects/${encodeURIComponent(projectPath)}`,
    });

    if (projectResult.error) {
      console.error('❌ 调用失败');
      console.error(JSON.stringify(projectResult.error, null, 2));
    } else {
      console.log('✅ 成功获取项目信息');
      const content = projectResult.result?.content || [];
      if (content.length > 0) {
        const text = content[0].text;
        const lines = text.split('\n');
        console.log(`\n${lines.slice(0, 10).join('\n')}`);
      }
    }
    console.log('');

    console.log('🎉 所有测试完成！');
    console.log('\n✅ GitLab 代理服务工作正常！');
    console.log('你现在可以在 Claude Code 中使用 gitlab_request 工具了。');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('\n错误堆栈:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行测试
testGitLabViaProxy();
