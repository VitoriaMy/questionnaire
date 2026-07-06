# Serverless Survey System

一个基于 GitHub Pages、Vercel Serverless Function 和 GitHub Actions 的开源问卷系统模板。前端负责采集反馈，后端负责隐藏 GitHub Token 并写入私有仓库，数据仓库再通过工作流生成可读的 Markdown 汇总报表。

## 项目结构

```text
.
├── api/
│   └── submit.js
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
│   └── workflows/
│       └── aggregate.yml
├── package.json
└── README.md
```

## 工作原理

1. 用户在 GitHub Pages 上访问由 React + Vite 构建出的静态页面。
2. 页面以 JSON 方式将表单数据提交到 Vercel 接口。
3. Vercel 读取环境变量中的 GitHub Token，并把数据写入私有仓库的 responses 目录。
4. 私有仓库中的 GitHub Actions 自动聚合 responses 下的 JSON 文件并生成 SUMMARY.md。

## 多问卷支持

当前版本已支持多个问卷共存，默认通过静态 JSON 配置提供三类问卷示例：社区反馈、功能投票、活动报名。

前端技术栈已经切换为 React、Vite、Tailwind CSS 与 shadcn 风格组件。

工作方式如下：

1. 前端会先读取 public/surveys/index.json，再按 URL 中的 survey 参数加载指定问卷。
2. 每次提交都会携带 surveyId 和 surveyTitle。
3. 后端会把数据写入 responses/问卷ID/data-时间戳.json。
4. 汇总工作流会递归读取 responses 下的所有子目录，并按问卷统计提交量。

如果你要新增问卷，需要在 public/surveys 下新增一个 JSON 文件，并把文件名写入 public/surveys/index.json。

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

3. 配置前端 API 地址。你可以二选一：

   - 在根目录 index.html 中修改 survey-api-url 元信息。
   - 在本地或部署环境里设置 VITE_SURVEY_API_URL。

   例如：

   https://your-vercel-project.vercel.app/api/submit

4. 启动本地开发服务

   npm run dev

5. 打开 Vite 本地地址并访问首页，提交一条测试反馈。

访问指定问卷时，使用 URL 参数，例如：

https://你的页面地址/?survey=community-feedback

## 部署步骤

### 1. 准备数据仓库

- 创建一个私有 GitHub 仓库作为数据仓库。
- 将本项目中的 .github/workflows/aggregate.yml 复制到该私有仓库。
- 如果你希望仓库初始化后立即具备目录结构，可以先提交一个空的 responses 目录占位文件。
- 如果启用多问卷，responses 下会按问卷 ID 自动创建子目录，不需要手工预建。

### 2. 部署 Vercel 后端

- 将当前项目导入 Vercel。
- 在 Vercel 项目设置中添加 GH_TOKEN、GH_OWNER、GH_DATA_REPO。
- 部署完成后，记下接口地址：https://你的项目域名/api/submit

### 3. 发布 GitHub Pages 前端

- 本项目已提供 .github/workflows/deploy-pages.yml，会先执行 npm ci 和 npm run build，再把 dist 目录发布到 GitHub Pages。
- 把根目录 index.html 中的 survey-api-url 改成真实的 Vercel 接口地址，或者在构建环境中设置 VITE_SURVEY_API_URL。
- 如果要访问特定问卷，使用页面地址加 survey 参数，例如 ?survey=feature-voting。
- 将代码推送到 main 分支后，GitHub Actions 会自动部署前端页面。
- 部署完成后，用户即可通过 GitHub Pages 页面直接提交反馈。

## GitHub 运行配置

这一节只说明 GitHub 侧必须完成的配置，目的是让 Vercel 能写入数据仓库，并让数据仓库内的 GitHub Actions 能自动生成汇总报表。

### 1. 创建两个仓库

- 前端仓库：用于保存当前项目源码，并通过 GitHub Pages 发布 React 构建产物 dist。
- 数据仓库：建议使用私有仓库，专门保存 responses 目录和 SUMMARY.md。

推荐做法是把前端仓库和数据仓库分开。这样前端公开、数据私有，职责也更清晰。

### 2. 初始化数据仓库

在数据仓库中至少准备以下内容：

```text
.
├── .github/
│   └── workflows/
│       └── aggregate.yml
└── responses/
```

- 把本项目中的 .github/workflows/aggregate.yml 复制到数据仓库。
- 在 responses 目录下放一个占位文件，例如 .gitkeep，确保目录会被 Git 跟踪。
- 本项目已提供 responses/.gitkeep 和 SUMMARY.md 初始化模板，可以直接一起复制到数据仓库。
- 首次推送后，到仓库的 Actions 页面确认工作流已被识别。

### 3. 创建 GitHub Token

Vercel 后端通过 GitHub API 向数据仓库写文件，因此需要一个具备最小必要权限的 Token。

如果你使用 Fine-grained personal access token，建议配置如下：

- Repository access：只授予数据仓库。
- Permissions / Contents：Read and write。
- Metadata：Read。

如果你使用经典 Personal Access Token，至少需要 repo 权限。不要授予额外的管理类权限。

### 4. 配置 Vercel 使用的 GitHub 环境变量

在 Vercel 项目的 Environment Variables 中设置：

- GH_TOKEN：上一步创建的 GitHub Token。
- GH_OWNER：数据仓库所属用户或组织名。
- GH_DATA_REPO：数据仓库名，不包含 owner。

例如你的数据仓库是 sheng/survey-data，那么：

- GH_OWNER=sheng
- GH_DATA_REPO=survey-data

### 5. 开启数据仓库的 Actions 写权限

工作流需要把生成后的 SUMMARY.md 提交回仓库，因此数据仓库必须允许 GitHub Actions 写入内容。

在数据仓库中依次进入：

- Settings
- Actions
- General

确认以下配置：

- Workflow permissions 选择 Read and write permissions。
- 勾选 Allow GitHub Actions to create and approve pull requests 可以不必开启，本项目直接 push，不依赖 PR。

如果不打开写权限，aggregate.yml 会在 git push 时报权限错误。

### 6. 配置 GitHub Pages

如果你使用 GitHub Pages 托管前端，可以在前端仓库中这样设置：

- 进入 Settings。
- 打开 Pages。
- Source 选择 GitHub Actions。
- 保持 .github/workflows/deploy-pages.yml 在前端仓库中。
- 默认推送到 main 分支时，工作流会自动发布 public 目录。

这个工作流使用 GitHub 官方 Pages Actions：

- actions/configure-pages@v5
- actions/upload-pages-artifact@v3
- actions/deploy-pages@v4

如果你的默认分支不是 main，需要同步修改 .github/workflows/deploy-pages.yml 中的触发分支。

### 7. 提交前必须替换的地址

在前端页面中，survey-api-url 目前是占位值。上线前必须改成真实接口地址，否则页面会直接提示未配置。

示例：

```text
https://your-vercel-project.vercel.app/api/submit
```

### 8. 首次联调检查清单

- 从 GitHub Pages 打开页面，提交一条测试数据。
- 到 Vercel Functions 日志确认请求返回 200。
- 到数据仓库确认 responses 下出现新的 data-时间戳.json。
- 到数据仓库 Actions 页面确认 aggregate 工作流已执行。
- 确认 SUMMARY.md 已自动更新。

### 9. 常见问题

- 提交接口返回 500：优先检查 GH_TOKEN、GH_OWNER、GH_DATA_REPO 是否填错。
- 数据仓库没有新文件：优先检查 Token 是否真的对该仓库有 Contents write 权限。
- 工作流没有回写 SUMMARY.md：优先检查数据仓库的 Workflow permissions 是否为 Read and write。
- GitHub Pages 页面提交失败：优先检查 survey-api-url 是否仍是占位地址，或 Vercel 域名是否写错。

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