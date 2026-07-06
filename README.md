# GitHub Issue Survey System

一个只依赖 GitHub 自身免费服务的单仓库问卷系统。问卷配置保存在仓库文件中，用户通过 GitHub Issue Forms 提交问卷，GitHub Actions 自动把提交结果同步到仓库内的数据文件，并更新汇总报表。

## 项目结构

```text
.
├── public/
│   └── surveys/
│       ├── index.json
│       └── *.json
├── data/
│   └── responses/
│       └── .gitkeep
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── config.yml
│   │   └── *.yml
│   └── workflows/
│       └── sync-survey-data.yml
├── summary/
│   └── .gitkeep
├── scripts/
│   └── validate-surveys.js
├── package.json
└── README.md
```

## 工作原理

1. 问卷配置存放在 public/surveys/*.json。
2. 每个问卷配置通过 issueTemplate 字段绑定一个 GitHub Issue Form 模板。
3. 用户在当前公开仓库中直接使用 Issue Form 提交问卷。
4. GitHub Actions 按定时任务重新构建 data/responses 下的数据文件。
5. GitHub Actions 同时更新 summary/ 下的各问卷汇总报表。

## 单仓库模式

整个方案就是单仓库模式，不依赖外部后端：

- 问卷配置在当前仓库。
- Issue Forms 由问卷 JSON 自动生成并保存在当前仓库。
- 提交数据文件在当前仓库。
- 每个问卷的汇总报表都在当前仓库的 summary/ 目录。
- 自动化工作流也在当前仓库。

## 问卷配置

索引文件 public/surveys/index.json 记录所有问卷文件名。

每个问卷文件至少包含：

- id：问卷唯一标识。
- issueTemplate：对应的 Issue Form 模板文件名。
- title：问卷标题。
- description：问卷说明。
- shortDescription：问卷短说明。
- fields：字段数组。

每次修改问卷 JSON 后，运行一次：

```bash
npm run generate:issue-templates
```

这样会自动重建 .github/ISSUE_TEMPLATE 下的模板文件，避免手工维护两份配置。

支持的字段类型：

- input
- textarea
- email
- date
- rating
- select
- radio
- checkbox

## 数据落盘规则

定时任务执行后，工作流会把问卷结果转换成仓库内的数据文件：

```text
data/responses/<surveyId>/issue-<issueNumber>.json
```

单条数据示例：

```json
{
  "issueNumber": 12,
  "issueTitle": "[Community Feedback] 登录流程建议",
  "issueUrl": "https://github.com/your-org/your-public-repo/issues/12",
  "issueState": "open",
  "issueAuthor": "octocat",
  "reporter": "octocat",
  "surveyId": "community-feedback",
  "surveyTitle": "社区用户意见征集",
  "submittedAt": "2026-07-06T12:00:00.000Z",
  "updatedAt": "2026-07-06T12:05:00.000Z",
  "answers": {
    "feedback": "希望增加导出能力"
  },
  "summaryText": "改进建议 / 需求反馈: 希望增加导出能力"
}
```

每个问卷还会生成独立汇总文件：

```text
summary/index.md
summary/community-feedback.md
summary/feature-voting.md
summary/event-registration.md
```

文件名与问卷配置文件名保持一致，只是扩展名由 .json 变成 .md。

每个独立汇总文件会输出：

- 问卷标题、更新时间、配置文件名。
- 当前问卷的总提交数。
- 一张按字段展开的 Markdown 表格，表头来自该问卷的 fields.label。

另外还会生成一个总览文件：

- summary/index.md

这个文件会列出所有问卷、对应配置文件、提交数，以及各自汇总文件的链接。

## GitHub 配置

### 1. 启用 Issue Forms

- 保持 .github/ISSUE_TEMPLATE 目录存在。
- 模板由 npm run generate:issue-templates 自动生成。
- 每个问卷配置里的 issueTemplate 要和目标模板文件名一致。

### 2. 启用 Actions 写权限

在仓库中进入：

- Settings
- Actions
- General

确认：

- Workflow permissions 选择 Read and write permissions。

### 3. 触发方式

工作流当前支持两种触发方式：

- 每小时自动执行一次。
- 在 Actions 页面手动执行一次。

工作流会读取当前仓库中所有带 survey-response 标签的 Issue。

## 本地校验

1. 安装依赖

   npm install

2. 生成 Issue Form 模板

  npm run generate:issue-templates

3. 校验问卷配置与模板一致性

   npm run validate:surveys

## 自动汇总

工作流文件在 .github/workflows/sync-survey-data.yml。

它会：

1. 读取当前仓库所有带 survey-response 标签的 Issue。
2. 按问卷标签 survey:xxx 识别问卷类型。
3. 解析 Issue Form 生成的正文。
4. 重建 data/responses 下的问卷数据文件。
5. 为每个问卷重建 summary/<问卷配置名>.md，并按问卷字段展开明细表。
6. 重建 summary/index.md 作为所有问卷汇总入口。

注意：

- 用户提交 Issue 后不会立即同步到数据文件。
- 数据同步会在下一次定时执行时发生，或者你手动运行工作流时发生。

## 常见问题

- Issue 刚提交但还没同步到数据文件：这是预期行为，请等待下一次定时执行，或手动运行工作流。
- Issue 长时间没有被同步到数据文件：优先检查是否带有 survey-response 标签。
- 同步后数据落到了错误问卷：优先检查 survey:xxx 标签是否正确。
- 工作流没有回写 summary/ 下的汇总文件：优先检查 Actions 权限是否为 Read and write。
- 某个问卷没有生成独立汇总文件：优先检查该问卷是否存在对应的 survey:xxx 标签，以及 public/surveys/index.json 中是否仍包含该问卷配置文件。
- generate:issue-templates 后模板不符合预期：优先检查 public/surveys/*.json 的字段类型、label、options 和 issueTemplate。
- validate:surveys 失败：优先检查 public/surveys/index.json、问卷 JSON 和 .github/ISSUE_TEMPLATE 文件名是否一致。

## 后续可选增强

- 在汇总报表中按状态、时间、标签细分统计。
- 增加问卷配置 schema 校验和 CI 检查。