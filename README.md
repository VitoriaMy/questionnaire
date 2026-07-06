# GitHub Public Survey System

一个只依赖 GitHub 自身免费服务的公开问卷系统模板。前端通过 GitHub Pages 托管，问卷提交通过 GitHub Issue Forms 完成，GitHub Actions 负责自动汇总并生成公开的 Markdown 报表。

## 项目结构

```text
.
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── components/
├── index.html
├── public/
│   └── surveys/
│       ├── index.json
│       └── *.json
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
│       ├── aggregate.yml
│       └── deploy-pages.yml
├── package.json
└── README.md
```

## 工作原理

1. 用户在 GitHub Pages 上访问由 React + Vite 构建出的静态页面。
2. 页面根据 URL 参数定位问卷，并跳转到对应的 GitHub Issue Form。
3. 用户在公开仓库中以 Issue 形式提交问卷数据。
4. GitHub Actions 监听问卷 Issue 变更，自动汇总并生成 SUMMARY.md。

## 多问卷支持

当前版本已支持多个问卷共存，默认通过静态 JSON 配置提供三类问卷示例：社区反馈、功能投票、活动报名。

前端技术栈已经切换为 React、Vite、Tailwind CSS 与 shadcn 风格组件。

工作方式如下：

1. 前端会先读取 public/surveys/index.json，再按 URL 中的 survey 参数加载指定问卷。
2. 每个问卷 JSON 通过 issueTemplate 指向对应的 GitHub Issue Form 模板。
3. 用户点击页面按钮后，会跳转到公开仓库的 Issue 创建页。
4. 汇总工作流会读取带有 survey-response 标签的公开 Issues，并按问卷统计提交量。

如果你要新增问卷，需要在 public/surveys 下新增一个 JSON 文件，并把文件名写入 public/surveys/index.json。
同时，你还需要在 .github/ISSUE_TEMPLATE 下新增对应的 Issue Form 文件。

字段类型目前支持：

- input：单行文本输入。
- textarea：多行文本输入。
- email：邮箱输入。
- date：日期输入。
- rating：评分输入，使用 scaleMin 和 scaleMax 定义范围。
- select：下拉选择，必须提供 options。
- radio：单选，必须提供 options。
- checkbox：多选，必须提供 options。

字段结构示例：

```json
{
   "name": "priorityLevel",
   "label": "你的优先级判断",
   "type": "radio",
   "options": [
      {
         "value": "p0",
         "label": "P0 - 必须优先处理",
         "description": "没有这个功能会明显影响当前使用。"
      }
   ]
}
```

其中：

- name：字段提交名。
- label：页面展示名。
- type：字段类型。
- placeholder：适用于 input 和 textarea。
- scaleMin / scaleMax：适用于 rating。
- options：适用于 select、radio、checkbox。
- required：可选，传 false 时表示非必填；默认必填。

## 环境要求

- Node.js 20+
- 一个公开 GitHub 仓库
- GitHub Pages
- GitHub Actions

## 本地启动

1. 安装依赖

   npm install

2. 配置公开仓库地址。你可以二选一：

   - 在根目录 index.html 中修改 github-repo-url 元信息。
   - 在本地或部署环境里设置 VITE_GITHUB_REPO_URL。

   例如：

   https://github.com/your-org/your-public-repo

3. 启动本地开发服务

   npm run dev

4. 打开 Vite 本地地址并访问首页，点击某个问卷并确认它会跳转到 GitHub Issue Form。

访问指定问卷时，使用 URL 参数，例如：

https://你的页面地址/?survey=community-feedback

## 部署步骤

### 1. 创建公开仓库

- 创建一个公开 GitHub 仓库，用来同时承载前端页面、Issue Forms 和汇总结果。
- 把当前项目完整推送到这个公开仓库。

### 2. 启用 GitHub Pages

- 进入仓库 Settings。
- 打开 Pages。
- Source 选择 GitHub Actions。
- 保持 .github/workflows/deploy-pages.yml 在仓库中。

### 3. 启用公开问卷提交

- 保持 .github/ISSUE_TEMPLATE 目录中的问卷模板。
- 在 index.html 中把 github-repo-url 改成你的真实仓库地址，或者在构建环境中设置 VITE_GITHUB_REPO_URL。
- 如果要访问特定问卷，使用页面地址加 survey 参数，例如 ?survey=feature-voting。

### 4. 自动汇总

- aggregate.yml 会监听带 survey-response 标签的 Issue 变更。
- 每次新增、编辑、关闭或重新打开问卷 Issue 后，SUMMARY.md 都会自动更新。

## GitHub 运行配置

这一节只说明 GitHub 侧必须完成的配置，目的是让公开仓库同时承担 Pages、Issue Forms 和自动汇总报表能力。

### 1. Pages 配置

- 进入仓库 Settings。
- 打开 Pages。
- Source 选择 GitHub Actions。
- 推送到 main 分支后，deploy-pages.yml 会自动构建并发布 dist。

### 2. Issue Forms 配置

- 保持 .github/ISSUE_TEMPLATE 目录在仓库中。
- 可以按 public/surveys/*.json 中的 issueTemplate 字段新增或修改模板。
- 建议保留 survey-response 和 survey:* 标签，用于自动汇总。

### 3. Actions 写权限

工作流需要把生成后的 SUMMARY.md 提交回当前公开仓库，因此仓库必须允许 GitHub Actions 写入内容。

在仓库中依次进入：

- Settings
- Actions
- General

确认以下配置：

- Workflow permissions 选择 Read and write permissions。

### 4. 必须替换的仓库地址

在前端页面中，github-repo-url 目前是占位值。上线前必须改成真实的公开 GitHub 仓库地址，否则页面只会提示配置错误。

示例：

```text
https://github.com/your-org/your-public-repo
```

### 5. 首次联调检查清单

- 从 GitHub Pages 打开页面。
- 切换到某个问卷并点击跳转按钮。
- 确认 GitHub 打开的 Issue 页面使用了正确的模板。
- 提交一条公开问卷 Issue。
- 到仓库 Actions 页面确认 aggregate 工作流已执行。
- 确认 SUMMARY.md 已自动更新。

### 6. 常见问题

- 页面提示仓库地址未配置：优先检查 github-repo-url 或 VITE_GITHUB_REPO_URL 是否仍是占位值。
- 点击按钮没有打开正确模板：优先检查 public/surveys/*.json 中的 issueTemplate 是否与 .github/ISSUE_TEMPLATE 文件名一致。
- 工作流没有回写 SUMMARY.md：优先检查仓库的 Workflow permissions 是否为 Read and write。
- Pages 页面没更新：优先检查仓库 Pages 的 Source 是否已切换到 GitHub Actions。

## 数据格式

后端会把每次提交写成 responses/问卷ID/data-时间戳.json，内容类似：

```json
{
   "surveyId": "community-feedback",
   "surveyTitle": "社区用户意见征集",
  "username": "octocat",
  "feedback": "希望增加导出能力",
   "summaryText": "改进建议 / 需求反馈: 希望增加导出能力",
  "submittedAt": "2026-07-06T12:00:00.000Z"
}
```

## 自动汇总说明

- aggregate.yml 会递归读取 responses 下所有子目录中的 .json 文件。
- 无法解析的文件会被跳过，不会导致整个流程失败。
- 汇总结果会按提交时间排序，并按问卷输出提交量统计和明细表。
- 自动提交消息带有 [skip ci]，用于避免不必要的重复构建。

## 安全建议

- 不要把 GH_TOKEN 写进前端页面或仓库源码。
- 建议为 Token 只授予最小必要权限。
- 如果需要限制调用来源，可以在 api/submit.js 中把 Access-Control-Allow-Origin 改成你的固定域名。

## 后续可选增强

- 为表单增加更多字段，例如邮箱、产品模块、优先级。
- 在服务端增加简单限流和机器人校验。
- 为 GitHub Pages 增加自动部署工作流。