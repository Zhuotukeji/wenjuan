# AI 工作流课前问卷

这是一个可一键部署到 Vercel 的课前问卷系统，用来收集综合部、商务同事在 AI 培训前的真实工作场景。

问卷围绕一条工作流展开：

```text
真实任务 -> 输入材料 -> 处理步骤 -> 输出标准 -> 人工检查点 -> 小系统雏形
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FZhuotukeji%2Fwenjuan&env=ADMIN_TOKEN,KV_REST_API_URL,KV_REST_API_TOKEN&envDescription=ADMIN_TOKEN%20is%20the%20admin%20password.%20KV_REST_API_URL%20and%20KV_REST_API_TOKEN%20come%20from%20Vercel%20KV%20or%20Upstash%20Redis%20integration.&project-name=ai-workflow-survey&repository-name=wenjuan)

## 功能

- 访问 `/` 直接进入问卷页面。
- 首页右上角“登录”可输入管理口令进入后台。
- 访问 `/admin` 时，未登录会先显示口令登录页。
- 后台用表格查看所有提交答案。
- 支持关键词、部门、任务类型筛选。
- 支持复制讲师摘要、导出 CSV、导出 JSON。
- 数据存储使用 Upstash Redis，不使用 Google Apps Script、Google Sheet 或 Webhook。

## Vercel 部署

1. 在 Vercel 中导入 GitHub 仓库。
2. 在 Vercel Marketplace 创建或绑定 Upstash Redis。
3. 配置环境变量。
4. 重新部署项目。

如果部署后访问首页出现 `404: NOT_FOUND`，请检查 Vercel 项目设置：

- `Framework Preset` 应为 `Next.js`。
- `Root Directory` 留空，指向仓库根目录。
- `Output Directory` 留空，不要填 `public`、`dist` 或 `.next`。
- `Build Command` 使用 `npm run build`，或留空让 Vercel 自动读取。
- 修改设置后，到 `Deployments` 里对最新提交重新 `Redeploy`。

必填环境变量：

```text
ADMIN_TOKEN=你自己设置的管理口令
KV_REST_API_URL=Vercel KV / Upstash 自动生成的 REST API URL
KV_REST_API_TOKEN=Vercel KV / Upstash 自动生成的 REST API Token
```

也兼容 Upstash 风格变量名：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

如果 Vercel 只自动注入了 Redis 连接串，也可以使用：

```text
KV_URL
REDIS_URL
```

如果没有配置 Redis，首页仍然可以访问，但提交问卷时会显示“后台存储未配置”的错误提示。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

本地调试后台时，如果没有设置 `ADMIN_TOKEN`，可以空口令进入；生产环境必须设置 `ADMIN_TOKEN`。

## 页面入口

```text
/       问卷首页
/admin  管理后台
```

## 数据结构

Redis 使用一个 List 保存提交：

```text
ai-workflow-survey:submissions
```

提交时使用 `LPUSH` 写入完整问卷 JSON，后台读取时使用 `LRANGE 0 -1`，最新提交显示在最前面。

## 问卷设计重点

- 让同事带一个真实工作任务，而不是泛泛写“想了解 AI”。
- 要求填写输入材料、输出类型、好结果标准和人工检查点。
- 自动生成“讲师可用摘要”，方便筛选课堂案例。
- 用“工作流潜力”提示哪些案例最适合现场深挖。
- 内置脱敏提醒，降低客户、合同、个人信息泄露风险。

## 建议课前通知

```text
各位同事好：

本次 AI 培训希望帮助大家把日常工作中的重复任务，拆成可以复用的 AI 工作流。

请在培训前填写课前问卷。填写时请尽量选择一个具体、真实、经常发生的工作任务，例如会议纪要、客户跟进、通知公告、方案初稿、培训反馈总结等。

如果涉及客户名称、金额、合同、个人信息、公司内部敏感内容，请提前脱敏处理。

培训现场会优先选择部分典型场景进行拆解，帮助大家形成自己的 AI 工作流或小系统雏形。
```
