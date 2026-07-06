# Serverless Survey System

一个基于 GitHub Pages、Vercel Serverless Function 和 GitHub Actions 的开源问卷系统模板。前端负责采集反馈，后端负责隐藏 GitHub Token 并写入私有仓库，数据仓库再通过工作流生成可读的 Markdown 汇总报表。

## 项目结构

```text
.
├── api/
│   └── submit.js
├── public/
│   └── index.html
├── .github/
│   └── workflows/
│       └── aggregate.yml
├── package.json
└── README.md
```

## 工作原理

1. 用户在 GitHub Pages 上访问静态表单页面。
2. 页面以 JSON 方式将表单数据提交到 Vercel 接口。
3. Vercel 读取环境变量中的 GitHub Token，并把数据写入私有仓库的 responses 目录。
4. 私有仓库中的 GitHub Actions 自动聚合 responses 下的 JSON 文件并生成 SUMMARY.md。

## 环境要求

- Node.js 20+
- 一个用于托管前端源码的仓库
- 一个用于保存问卷数据的 GitHub 私有仓库
- 一个具有目标私有仓库 Contents 写权限的 GitHub Token
- 一个 Vercel 账号

## 本地启动

1. 安装依赖

   npm install

2. 在本地或 Vercel 中配置以下环境变量

   GH_TOKEN=你的 GitHub Token
   GH_OWNER=你的 GitHub 用户名或组织名
   GH_DATA_REPO=保存 responses 数据的私有仓库名

3. 修改 public/index.html 中的 survey-api-url 元信息，把地址替换为你的 Vercel 接口地址，例如：

   https://your-vercel-project.vercel.app/api/submit

4. 启动本地开发服务

   npm start

5. 打开 Vercel 本地地址并访问首页，提交一条测试反馈。

## 部署步骤

### 1. 准备数据仓库

- 创建一个私有 GitHub 仓库作为数据仓库。
- 将本项目中的 .github/workflows/aggregate.yml 复制到该私有仓库。
- 如果你希望仓库初始化后立即具备目录结构，可以先提交一个空的 responses 目录占位文件。

### 2. 部署 Vercel 后端

- 将当前项目导入 Vercel。
- 在 Vercel 项目设置中添加 GH_TOKEN、GH_OWNER、GH_DATA_REPO。
- 部署完成后，记下接口地址：https://你的项目域名/api/submit

### 3. 发布 GitHub Pages 前端

- 将 public/index.html 作为静态页面发布到 GitHub Pages。
- 把页面头部的 survey-api-url 改成真实的 Vercel 接口地址。
- 提交并发布后，用户即可通过 GitHub Pages 页面直接提交反馈。

## 数据格式

后端会把每次提交写成 responses/data-时间戳.json，内容类似：

```json
{
  "username": "octocat",
  "feedback": "希望增加导出能力",
  "submittedAt": "2026-07-06T12:00:00.000Z"
}
```

## 自动汇总说明

- aggregate.yml 会读取 responses 下所有 .json 文件。
- 无法解析的文件会被跳过，不会导致整个流程失败。
- 汇总结果会按提交时间排序并写入 SUMMARY.md。
- 自动提交消息带有 [skip ci]，用于避免不必要的重复构建。

## 安全建议

- 不要把 GH_TOKEN 写进前端页面或仓库源码。
- 建议为 Token 只授予最小必要权限。
- 如果需要限制调用来源，可以在 api/submit.js 中把 Access-Control-Allow-Origin 改成你的固定域名。

## 后续可选增强

- 为表单增加更多字段，例如邮箱、产品模块、优先级。
- 在服务端增加简单限流和机器人校验。
- 为 GitHub Pages 增加自动部署工作流。