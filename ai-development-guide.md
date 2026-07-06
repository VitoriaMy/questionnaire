# 🤖 AI 开发者指南：Serverless 问卷系统全自动构建手册

## 🎯 角色定义
你现在是一位世界顶级的 **全栈架构师** 与 **顶级开源软件维护者**。你拥有极强的工程规范意识、高并发编码经验以及绝对安全的防御性编程思维。

你的任务是：根据本指南的“系统架构”与“文件规范”，在当前工作目录下**完整生成、初始化并配置**该无服务器（Serverless）开源问卷系统的所有核心源码文件。

---

## 🏗️ 系统架构与数据流
```text
[前端: GitHub Pages] 
       ↓ (POST json 跨域请求)
[后端: Vercel Serverless Function] (读取系统环境变量，隐藏 GitHub Token)
       ↓ (调用 GitHub API - Octokit)
[数据仓库: GitHub Private Repo] (异步写入 /responses/*.json)
       ↓ (触发 GitHub Actions 监听)
[自动化数据汇总: SUMMARY.md] (生成实时 Markdown 统计报表)
```

---

## 📁 目标文件树规范
请在当前项目根目录下严格按照以下拓扑结构创建文件，不得遗漏任何一个文件：
```text
├── api/
│   └── submit.js          # Vercel Serverless 后端路由（支持 CORS 与 安全写入）
├── public/
│   └── index.html         # 前端响应式问卷网页（GitHub Pages 托管）
├── .github/
│   └── workflows/
│       └── aggregate.yml  # 数据存储仓库专用的自动化报表流
├── package.json           # 项目元数据与依赖定义
└── README.md              # 面向用户的开源一键部署部署手册
```

---

## 💻 AI 源码生成指令（Code Generation Specifications）

请依次为您生成以下文件的完整、无删减代码。代码中**严禁包含**任何 `// TODO:` 或 `// 省略此处代码` 的占位符。

### 1️⃣ 依赖管理：`package.json`
请直接输出以下标准的 Node.js 配置文件：
```json
{
  "name": "serverless-survey-system",
  "version": "1.0.0",
  "description": "A open-source serverless survey system powered by GitHub Pages, Vercel, and GitHub Actions.",
  "main": "api/submit.js",
  "scripts": {
    "start": "vercel dev"
  },
  "dependencies": {
    "@octokit/core": "^6.1.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "license": "MIT"
}
```

### 2️⃣ 后端中转：`api/submit.js`
请编写一个 Node.js 函数，满足以下企业级安全要求：
1. **全局 CORS 中间件包装**：允许任何前端域名进行预检（`OPTIONS`）与 `POST` 请求。
2. **严格请求控制**：非 `POST` 请求一律返回 `405 Method Not Allowed`；空数据返回 `400 Bad Request`。
3. **数据加密传输**：将接收到的 JSON 格式化后转化为 `Base64` 编码。
4. **GitHub API 联动**：使用 `@octokit/core` 调用 `PUT /repos/{owner}/{repo}/contents/{path}`，文件命名规则为 `responses/data-${Date.now()}.json`。

```javascript
import { Octokit } from "@octokit/core";

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const formData = req.body;
    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).json({ success: false, message: 'Data submission cannot be empty' });
    }

    // 确保依赖的环境变量完整
    if (!process.env.GH_TOKEN || !process.env.GH_OWNER || !process.env.GH_DATA_REPO) {
      return res.status(500).json({ success: false, message: 'Server configuration error: Missing Environment Variables' });
    }

    const octokit = new Octokit({ auth: process.env.GH_TOKEN });
    const fileName = `data-${Date.now()}.json`; 
    const contentBase64 = Buffer.from(JSON.stringify(formData, null, 2)).toString("base64");

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: process.env.GH_OWNER,       
      repo: process.env.GH_DATA_REPO,   
      path: `responses/${fileName}`,     
      message: `Form submission ${fileName}`,
      content: contentBase64
    });

    return res.status(200).json({ success: true, message: 'Submission successful' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export default allowCors(handler);
```

### 3️⃣ 前端问卷：`public/index.html`
请基于原生 HTML5 和现代 CSS 变量（Variables）构建一个支持移动端响应式的优雅表单，并且使用 `fetch` 异步处理提交状态。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Open Survey - 现代问卷系统</title>
    <style>
        :root { --bg: #f6f8fa; --card-bg: #ffffff; --text: #24292f; --primary: #2da44e; --primary-hover: #2c974b; --border: #d0d7de; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: var(--card-bg); padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(140,149,159,0.1); width: 100%; max-width: 440px; border: 1px solid var(--border); }
        h2 { margin: 0 0 8px 0; color: var(--text); font-size: 24px; font-weight: 600; text-align: center; }
        p { text-align: center; color: #57606a; font-size: 14px; margin: 0 0 24px 0; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 6px; font-weight: 600; color: #24292f; font-size: 14px; }
        input, textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: border-color 0.2s; background: #fafafa; }
        input:focus, textarea:focus { outline: none; border-color: #0969da; background: #fff; box-shadow: 0 0 0 3px rgba(9,105,218,0.15); }
        textarea { resize: vertical; min-height: 120px; }
        button { background: var(--primary); color: white; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%; font-size: 14px; transition: background 0.2s; }
        button:hover { background: var(--primary-hover); }
        button:disabled { background: #85ea9d; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="card">
        <h2>📋 社区用户意见征集</h2>
        <p>开源离不开您的支持，请留下您最真实的想法。</p>
        <form id="surveyForm">
            <div class="form-group">
                <label for="username">GitHub 用户名</label>
                <input type="text" id="username" name="username" placeholder="例如: octocat" required>
            </div>
            <div class="form-group">
                <label for="feedback">改进建议 / 需求反馈</label>
                <textarea id="feedback" name="feedback" placeholder="请详细描述您的想法或遇到的问题..." required></textarea>
            </div>
            <button type="submit" id="submitBtn">提交反馈</button>
        </form>
    </div>

    <script>
        document.getElementById('surveyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerText = '正在安全加密传输...';

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            try {
                // ⚠️ 开发者注意：部署后请将下方 URL 替换为您在 Vercel 获得的真实公网域名 
                const API_URL = 'https://vercel.app';
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if(result.success) {
                    alert('🎉 提交成功！您的数据已安全写入数据存储库。');
                    e.target.reset();
                } else {
                    alert('❌ 提交失败: ' + result.error);
                }
            } catch (err) {
                alert('❌ 网络请求异常，请检查 Vercel 接口跨域配置或服务状态');
            } finally {
                btn.disabled = false;
                btn.innerText = '提交反馈';
            }
        });
    </script>
</body>
</html>
```

### 4️⃣ 自动流水线：`.github/workflows/aggregate.yml`
编写一个高容错率的 GitHub Actions 脚本。它将能够：
1. 读取 `responses/` 文件夹下可能发生乱序或空字段的所有 `.json`。
2. 提取数据，按照提交时间动态编排为支持 Markdown Table 语法的 `SUMMARY.md` 报表。
3. 使用 `[skip ci]` 尾缀提交代码，防止循环触发构建。

```yaml
name: Automated Data Aggregation

on:
  push:
    paths:
      - 'responses/**'

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Aggregate JSON to Markdown
        run: |
          node -e "
            const fs = require('fs');
            const path = './responses';
            if (!fs.existsSync(path)) {
              console.log('No data directory found.');
              return;
            }
            
            const files = fs.readdirSync(path).filter(f => f.endsWith('.json'));
            const totalData = files.map(f => {
              try {
                return JSON.parse(fs.readFileSync(\`\${path}/\${f}\`, 'utf8'));
              } catch(e) {
                return null;
              }
            }).filter(Boolean);
            
            let md = '# 📊 问卷统计最新汇总\\n\\n';
            md += \`> 💡 *本报表由 GitHub Actions 自动实时构建。更新时间 (UTC): \${new Date().toISOString()}*\\n\\n\`;
            md += '| 序号 | 用户名 | 意 见 反 馈 |\\n| :---: | :--- | :--- |\\n';
            
            totalData.forEach((item, index) => {
              const user = item.username ? item.username.replace(/\|/g, '\\\\|') : '匿名';
              const text = item.feedback ? item.feedback.replace(/\\n/g, '<br>').replace(/\|/g, '\\\\|') : '-';
              md += \`| \${index + 1} | \`\${user}\` | \${text} |\\n\`;
            });
            
            fs.writeFileSync('SUMMARY.md', md);
            console.log('SUMMARY.md compiled successfully.');
          "

      - name: Commit and Push Report
        run: |
          git config --global user.name "github-actions[bot]"
