#!/usr/bin/env ts-node
/**
 * GitLab API 测试脚本
 *
 * 测试访问指定的 MR 信息
 */

import { gitlabRequest, getGitLabConfig } from './src/gitlab';

async function testGitLabAPI() {
  console.log('=== GitLab API 测试 ===\n');

  // 检查配置
  const config = getGitLabConfig();
  if (!config) {
    console.error('❌ GitLab 配置未找到');
    console.error('请创建 gitlab-config.json 文件');
    process.exit(1);
  }

  console.log('✅ GitLab 配置已加载');
  console.log(`   Base URL: ${config.baseUrl}\n`);

  // 从 URL 提取信息
  // URL: http://gitlab-outer.myhexin.com/10jqka/cloud-software/f10/thsc-f10-biz/-/merge_requests/11
  const projectPath = '10jqka/cloud-software/f10/thsc-f10-biz';
  const projectPathEncoded = encodeURIComponent(projectPath); // URL 编码
  const mrIid = 11;

  console.log('测试目标:');
  console.log(`   项目路径: ${projectPath}`);
  console.log(`   MR IID: ${mrIid}\n`);

  try {
    // 测试 1: 获取 MR 基本信息
    console.log('📋 测试 1: 获取 MR 基本信息...');
    const mrInfo = await gitlabRequest({
      method: 'GET',
      path: `/api/v4/projects/${projectPathEncoded}/merge_requests/${mrIid}`,
    });

    if (mrInfo.status === 200) {
      console.log('✅ 成功获取 MR 信息');
      console.log(`   标题: ${mrInfo.data.title}`);
      console.log(`   状态: ${mrInfo.data.state}`);
      console.log(`   作者: ${mrInfo.data.author?.name}`);
      console.log(`   创建时间: ${mrInfo.data.created_at}`);
      console.log(`   源分支: ${mrInfo.data.source_branch} → ${mrInfo.data.target_branch}`);
    } else {
      console.error(`❌ 请求失败 (${mrInfo.status})`);
      console.error(JSON.stringify(mrInfo.data, null, 2));
    }
    console.log('');

    // 测试 2: 获取 MR Changes (Diff)
    console.log('📝 测试 2: 获取 MR Changes (Diff)...');
    const mrChanges = await gitlabRequest({
      method: 'GET',
      path: `/api/v4/projects/${projectPathEncoded}/merge_requests/${mrIid}/changes`,
    });

    if (mrChanges.status === 200) {
      console.log('✅ 成功获取 MR Changes');
      const changes = mrChanges.data.changes || [];
      console.log(`   变更文件数: ${changes.length}`);

      if (changes.length > 0) {
        console.log('\n   变更的文件:');
        changes.slice(0, 5).forEach((change: any) => {
          console.log(`   - ${change.new_path || change.old_path}`);
        });
        if (changes.length > 5) {
          console.log(`   ... 还有 ${changes.length - 5} 个文件`);
        }
      }
    } else {
      console.error(`❌ 请求失败 (${mrChanges.status})`);
      console.error(JSON.stringify(mrChanges.data, null, 2));
    }
    console.log('');

    // 测试 3: 获取 MR 讨论
    console.log('💬 测试 3: 获取 MR 讨论...');
    const mrDiscussions = await gitlabRequest({
      method: 'GET',
      path: `/api/v4/projects/${projectPathEncoded}/merge_requests/${mrIid}/discussions`,
    });

    if (mrDiscussions.status === 200) {
      console.log('✅ 成功获取 MR 讨论');
      const discussions = mrDiscussions.data || [];
      console.log(`   讨论数: ${discussions.length}`);

      if (discussions.length > 0) {
        console.log('\n   最近的评论:');
        discussions.slice(0, 3).forEach((discussion: any, index: number) => {
          const notes = discussion.notes || [];
          if (notes.length > 0) {
            const firstNote = notes[0];
            console.log(`   ${index + 1}. ${firstNote.author?.name}: ${firstNote.body?.substring(0, 50)}...`);
          }
        });
      }
    } else {
      console.error(`❌ 请求失败 (${mrDiscussions.status})`);
      console.error(JSON.stringify(mrDiscussions.data, null, 2));
    }
    console.log('');

    // 测试 4: 获取项目信息
    console.log('🏢 测试 4: 获取项目信息...');
    const projectInfo = await gitlabRequest({
      method: 'GET',
      path: `/api/v4/projects/${projectPathEncoded}`,
    });

    if (projectInfo.status === 200) {
      console.log('✅ 成功获取项目信息');
      console.log(`   项目名: ${projectInfo.data.name}`);
      console.log(`   项目 ID: ${projectInfo.data.id}`);
      console.log(`   描述: ${projectInfo.data.description || '(无)'}`);
      console.log(`   默认分支: ${projectInfo.data.default_branch}`);
    } else {
      console.error(`❌ 请求失败 (${projectInfo.status})`);
      console.error(JSON.stringify(projectInfo.data, null, 2));
    }
    console.log('');

    console.log('🎉 所有测试完成！');

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
testGitLabAPI();
