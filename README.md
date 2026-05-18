# AI 工作流课前问卷

这是一个零依赖、可部署到 Vercel 的课前问卷，用来收集综合部、商务同事在 AI 培训前的真实工作场景。

问卷不是普通满意度调查，而是围绕一条工作流展开：

```text
真实任务 -> 输入材料 -> 处理步骤 -> 输出标准 -> 人工检查点 -> 小系统雏形
```

## 本地运行

```bash
node local-server.mjs
```

打开 `http://localhost:3000`。

## 部署到 Vercel

1. 把本目录提交到 GitHub 仓库。
2. 在 Vercel 中选择 `New Project`，导入该仓库。
3. Framework Preset 选择 `Other` 或保持 Vercel 自动识别。
4. Build Command 留空。
5. Output Directory 留空。
6. 配置收集端点和管理口令环境变量后部署。

推荐环境变量：

```text
QUESTIONNAIRE_WEBHOOK_URL=https://script.google.com/macros/s/你的部署ID/exec
ADMIN_TOKEN=你自己设置的管理口令
```

也兼容以下变量名：

```text
GOOGLE_SHEETS_WEBHOOK_URL
FORM_WEBHOOK_URL
```

如果未配置收集端点，问卷仍可填写，但结果不会持久写入表格；提交页会给出可复制的摘要。

## 管理后台

部署后打开：

```text
https://你的域名/admin.html
```

后台支持：

- 查看所有问卷提交
- 按关键词、部门、任务类型筛选
- 查看部门分布、高频痛点、平均完整度、平均工作流潜力
- 复制讲师摘要
- 导出 CSV / JSON

如果设置了 `ADMIN_TOKEN`，后台读取数据时需要输入同一个口令。

注意：Vercel 的本地文件写入不适合作为长期数据库。正式收集请配置 Google Sheet Webhook；本地 JSON 备份主要用于开发测试和兜底反馈。

## 收集到 Google Sheet

1. 新建一个 Google Sheet。
2. 打开 `扩展程序 -> Apps Script`。
3. 将 `google-apps-script/Code.gs` 的内容粘贴进去。
4. 运行一次 `setup`，授权脚本。
5. 点击 `Deploy -> New deployment`。
6. 类型选择 `Web app`。
7. Execute as 选择 `Me`。
8. Who has access 选择 `Anyone` 或组织内可访问范围。
9. 复制 Web app URL，填到 Vercel 的 `QUESTIONNAIRE_WEBHOOK_URL`。
10. 重新部署 Vercel 项目。

如果你设置了 Vercel 的 `ADMIN_TOKEN`，建议在 Apps Script 里也设置同一个口令：

1. 打开 Apps Script。
2. 进入 `Project Settings`。
3. 在 `Script Properties` 中新增 `ADMIN_TOKEN`。
4. 值填写你的管理口令。

## 问卷设计重点

- 让同事带一个真实工作任务，而不是泛泛写“想了解 AI”。
- 要求填写输入材料、输出类型、好结果标准和人工检查点。
- 自动生成“讲师可用摘要”，方便你筛选课堂案例。
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
