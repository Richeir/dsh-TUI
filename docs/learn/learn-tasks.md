# dsh-TUI 学习任务清单

> 本文档是进入 dsh-TUI 仓库（`@deepseek-harness-tui/dsh-tui`）的分阶段学习路径：
> 每个阶段给出 **Check List**（可勾选）与 **详细说明**（学什么、看哪个文件、
> 怎么验证）。建议按阶段顺序推进，用 `- [ ]` 勾选进度。
>
> **阅读顺序建议**：先读本清单末尾的「0. 前置约定」，再按阶段 0 → 6 推进。
>
> **源码路径约定**：下文所有 `src/...`、`docs/...` 相对仓库根目录
> （`dsh-TUI/`）。

## 0. 前置约定：先读的权威文档

动手前先建立「项目是什么、边界在哪、红线是什么」的认知：

- [ ] 读 [`AGENTS.md`](../../AGENTS.md)——本仓库一切人/代理工作的顶层约定
- [ ] 读 [`docs/contributing.md`](../contributing.md)——共享开发契约（**权威**：
  仓库地图、工具链、构建、验证矩阵、风格、架构不变量）
- [ ] 读 [`ADAPTER.md`](../../ADAPTER.md)——上游边界：官方 `@deepseek-ai/*`
  只允许在 `src/dsh-adapter/` 内 import；版本线与 patch surface
- [ ] 读 [`docs/architecture.md`](../architecture.md)——运行链路、模块边界、
  Session 真源、渲染与性能、权限边界、已知限制

**关键认知（先记住这三条）：**

1. **纯插件、零核心改动**：本包是 DeepSeek Harness 的 Cordis 插件，Agent、会话、
   模型、工具、持久化与策略域都归 DSH 所有，TUI 只消费它们。
2. **Session 是真源**：transcript 行从持久化的 DSH 会话事件投影而来，绝不从
   React 本地数组臆造。
3. **分层职责**：投影/动作 → `channel.ts`；交互/按键 → `Chat.tsx`；视觉 →
   `components/`；终端协议/布局/差分 → `ink/`。不要越层。

> 说明：`docs/project-documentation/` 是旧审计基线（v0.4.1-48-gb2f4087）的内部
> 架构文档，路径与数据目录已过期（`src/plugin.ts` → `src/dsh-adapter/plugin.ts`、
> `~/.dsh-cc` → `~/.dsh-tui`）。作为**参考索引**很好用，但引用时以活文档与源码
> 为准。

---

## 1. 阶段 0：环境准备（让项目跑起来）

目标：干净克隆、安装、构建、冒烟通过，并具备跑真 TUI 的凭证。

### Check List

- [ ] 检查环境：Node `^22.19 || >=24`（CI 用 24）、pnpm 11
- [ ] 克隆仓库并确认子模块：`git submodule update --init --recursive`
  （`vendor/dsh-std`、`dsh-auth` 为子模块，见 `.gitmodules`）
- [ ] `pnpm install --frozen-lockfile` 成功
- [ ] `pnpm compile` 成功（生成 `lib/types/`）
- [ ] `pnpm build` 全绿（compile + 全部构建门禁 `verify:build`）
- [ ] `pnpm smoke` 通过（通用无头屏幕组装冒烟）
- [ ] 注册 `DEEPSEEK_API_KEY`，能启动真 TUI（见阶段 1）
- [ ] 装好 dsh CLI：`npm install -g @deepseek-ai/dsh`

### 详细说明

- **版本与包管理器**：`package.json` 的 `engines` 声明 `^22.19 || >=24`；锁文件
  是 `pnpm-lock.yaml`（pnpm 11）。**没有根级 `test`/`lint` 脚本**——静态关口是
  TypeScript 构建（`pnpm compile` = `tsc -p tsconfig.json` 输出到 `lib/types/`），
  行为验证靠聚焦脚本，不要声称跑过测试套件。
- **构建分两层**：
  - `pnpm compile`：先构建 vendored 依赖（`vendor/dsh-std`、`dsh-auth`），再
    `tsc` 编译 `src/` → `lib/types/`。
  - `pnpm build`：compile + `verify:build`（边界 / 契约 / manifest-deps /
    patch-surface / plugin 系列 / i18n 等十几道门禁）。
- **产物规则**：改 `src/`，**绝不手改 `lib/`**；不提交 `lib/` 生成结果。
- **可能遇到的坑**：pnpm ≥11 会拦带安装脚本的依赖（如 `@google/genai`、
  `protobufjs`），报 `ERR_PNPM_IGNORED_BUILDS`——按 README 在 profile 的
  `pnpm-workspace.yaml` 加 `allowBuilds` 即可，`/update` 会自动写。
- **无凭证也能学**：几乎所有 `scripts/verify-*`、`repro-*` 都是 headless 渲染器 +
  假服务，不需要真模型；真 TUI 只用于「端到端手动体验」。

---

## 2. 阶段 1：用户上手（知道产品怎么用）

目标：作为真实用户跑通核心交互，建立「界面长什么样、有哪些能力」的直觉。

### Check List

- [ ] 安装并启动：`dsh-tui` 或 `dst`（或 `dsh --profile dsh-tui`）
- [ ] 过一遍 [安装与快速开始](../getting-started.md)
- [ ] 过一遍 [交互与命令](../interaction.md)：快捷键、鼠标、问卷、slash 命令
- [ ] 过一遍 [使用说明](../user-guide.md)：键位速查、命令全集、会话工作流
- [ ] 试核心会话命令：`/new`、`/resume`、`/compact`、`/export`、`/model`、
  `/preset`、`/theme`、`/lang`、`/clear`、`/settings`
- [ ] 试首屏独有能力：思考流式展开、双击 Esc 时间回溯、上下文进度条、状态栏指标
- [ ] 跑环境自检：`/doctor`、`/config`、`/permissions`
- [ ] 切主题、改快捷键、试 inline 与 fullscreen 两种模式
- [ ] 读 [配置参考](../configuration.md)（Cordis 覆盖、Agent preset、MCP、环境变量）
- [ ] 读 [主题系统](../themes.md)（内置主题、自动检测、自定义 JSON 主题）

### 详细说明

- 这一阶段**不写代码**，但很关键：所有后续源码学习都以「这个 UI 行为在哪实现」
  为锚点。建议边用边记「我看到 X，怀疑在 src/Y 实现」，阶段 3 去验证。
- **两种界面模式**：inline（默认在主屏，终端模拟器管 scrollback）与 fullscreen
  （`AlternateScreen` 备用屏，TUI 自己管滚动/鼠标选区/OSC 52 复制）。两种模式
  共享 Channel 与 React 视图，但终端协议路径不同——这是后续理解 `ink/` 的入口。
- **能力清单快速认知**（对应 README「核心能力」）：实时工作状态行、TPS/缓存
  命中率、`/resume` 按工作目录分层浏览（左键恢复、右键操作菜单）、模型热切换、
  原生 subagent、会话 fork、自动更新、`/vim` 输入编辑等。
- **环境变量尝鲜**：`DSH_TUI_LANG` 切语言、`DSH_TUI_SESSION_ROOT` 改会话 JSONL
  根目录；`DEEPSEEK_API_KEY` 是密钥——只判断「是否已设置」，不打印完整值。

---

## 3. 阶段 2：架构概览（画出运行链路）

目标：能对着代码讲清「一条用户输入如何变成屏幕上的像素」。

### Check List

- [ ] 画出主链路图（见下），并在每个环节标注对应源码文件
- [ ] 通读 [`docs/architecture.md`](../architecture.md) 的「运行链路 / 模块边界」
- [ ] 读 `cordis.patch.yml` 与 `cordis.yml` 顶部，理解 profile 叠加机制
- [ ] 理解「Session 是真源」与「Channel 只保留投影」
- [ ] 理解「注册即效应 / 单一退出漏斗」与「渲染安静」两条红线
- [ ] 通读 [`docs/contributing.md`](../contributing.md) 的「运行时形态」与
  「架构不变量」两节

### 详细说明

**主运行链路**（`docs/architecture.md` 同口径）：

```text
Cordis profile（cordis.patch.yml / cordis.yml）
  -> src/index.ts（插件契约 + Schema，重导出 dsh-adapter/index.ts）
  -> src/dsh-adapter/plugin.ts（TTY 校验、服务注册、Agent 创建/恢复、React 挂载、退出清理）
  -> DSH agent / session / tool services（@deepseek-ai/*）
  -> src/dsh-adapter/channel.ts（session/event -> Channel 投影 + 动作面）
  -> src/screens/Chat.tsx（模态优先级、全局按键、slash 分发）
  -> src/components/*（视图）
  -> src/ui.ts（主题化 renderer facade）
  -> src/ink/* + src/native-ts/yoga-layout（布局、终端协议、差分输出）
  -> ANSI 终端
```

**模块边界速记**：

| 模块 | 一句话所有权 |
| --- | --- |
| `src/index.ts` | 轻量入口：插件名、`inject`、Config 接口与 Schema，动态移交 |
| `src/dsh-adapter/plugin.ts` | 运行时实现：装配、生命周期、统一清理 |
| `src/dsh-adapter/channel.ts` | 事件→视图投影 + 非 React 动作面（7393 行，最大的域文件） |
| `src/screens/Chat.tsx` | 顶层交互协调器（3768 行）：模态优先级、按键、滚动/搜索/选区 |
| `src/components/` | 功能组件 + `design-system/` 主题原语 + `messages/` transcript 行 + `questions/` 问卷 |
| `src/ui.ts` | 渲染器、主题化 `Box`/`Text`、hooks 与公共 TUI 原语的首选门面 |
| `src/ink/` | 移植 Ink 渲染器 + 终端协议 + Yoga 桥接（**敏感基础设施**） |
| `src/native-ts/yoga-layout/` | 移植的纯 TS 布局引擎 |
| `src/cc/` | Claude Code 风格终端格式化/呈现辅助 |
| `cordis.patch.yml` | profile bundle 覆盖层；行序、行 ID、insert/override 语义关键 |

**三条红线**（阶段 0 已提，这里要落到代码层）：

- **真源投影**：`channel.ts` 里 `The DSH session log is the source of truth`——
  transcript 行从 `session/event` 派生，保留事件顺序、sequence anchor、call-ID
  匹配；rewind/resume/折叠/导出都依赖它们。
- **职责分层**：不要在组件里复制 DSH Agent/session/tool 服务；新能力走既有
  service/registry/channel seam。
- **渲染安静**：TUI 活动期间不加 `console.log` 或 stdout 诊断；用 `DSH_TUI_DEBUG`
  （stderr）或 `DSH_TUI_RENDER_LOG`（帧捕获）。

> 可选项：`docs/project-documentation/architecture.mermaid` 是一张 Mermaid 架构
> 总图，可作为「对照参考」，但注意它是旧基线。

---

## 4. 阶段 3：逐层源码深潜（核心）

目标：按运行链路逐层读懂核心文件。**顺序即依赖顺序**：先入口，再投影，再交互，
再渲染。每层一个小 Check List。

### 4.1 插件入口与装配

- [ ] 读 `src/index.ts`（5 行：重导出 `./dsh-adapter/index.js`）
- [ ] 读 `src/dsh-adapter/index.ts`：插件 `name`、`inject = ['agents']`、Config 接口
  与 `Schema`（重点：为什么 `provider`/`model` 不设 Schema 默认值——issue #30，
  让持久化 `/model` 优先；为什么 `tuiWorkspaces` 不进代码级 inject——issue #183）
- [ ] 读 `src/dsh-adapter/plugin.ts` 的 `apply()`：TTY 检查、Agent 创建/恢复、
  React 树挂载、统一退出清理
- [ ] 找到 `registerPackagedSkills`、`registerPromptDebug`、`QuestionStore`、
  `ApprovalStore` 等装配点

**看什么**：入口保持轻量、运行时惰性移交；`apply()` 是插件生命周期的中心，
`ctx.effect` 与单一退出漏斗负责所有清理（raw 模式、光标、alt-screen、同步输出、
鼠标、焦点都要恢复）。

### 4.2 通道投影与动作面（channel.ts）

- [ ] 通读 `src/dsh-adapter/channel.ts` 头部模块注释与类型定义（`Channel`、
  `ChatRow`、各 Row kind）
- [ ] 理解「事件 → 投影」：初始历史回放 + 增量流式事件 → transcript 行
- [ ] 理解动作面：`submit` / `steer` / `rewind` / `resume` / 模型与 preset 切换 /
  本地报告
- [ ] 看工具结果如何按 `callId` 关联（不按数组位置）
- [ ] 看长会话折叠、回放合并、虚拟化、缓存上限相关代码

**看什么**：这是**域逻辑最集中的文件**（7393 行），也是「Session 是真源」的
实现地。读懂 `ChatRow` 的各类 kind 与投影规则，是理解整个 UI 的钥匙。不需要
一次读完，先抓：类型定义 → 主投影函数 → 一两个动作（如 submit、rewind）。

### 4.3 交互编排（Chat.tsx）

- [ ] 读 `src/screens/Chat.tsx` 头部 import 清单（能看出它聚合了多少子系统）
- [ ] 理解模态优先级与全局按键分发（聚焦的问卷/模态先于全局处理器消费按键）
- [ ] 理解滚动 / 搜索 / 选区状态
- [ ] 找到 slash 命令分发点（`runCommand`：本地命令 vs 注册表命令）
- [ ] 看 `src/screens/chatOverlay.ts`：覆盖层 reducer（workspace flow 输入等）
- [ ] 读 `src/commands.ts`：内置本地命令声明 + 解析辅助

**看什么**：`Chat.tsx`（3768 行）是**最大的交互文件**，负责把 channel 投影组装成
完整屏幕：状态栏、消息列表、输入框、各 Picker/面板、Trajectory。注意它不拥有
会话真相，只是消费 `Channel`。按键优先级是行为而非偶然控制流——这是本仓库反复
强调的不变量。

### 4.4 屏幕与组件层

- [ ] 通读 `src/screens/`：`StatusLine.tsx` + `StatusMetrics.ts`（状态栏与指标）、
  `SessionBrowser.tsx` / `SessionTree.tsx`（/resume 浏览）、`Settings.tsx`
  （/settings 屏幕）、`TrajectoryScene.tsx`
- [ ] 通读 `src/components/design-system/`：主题感知原语（`ThemedBox`、
  `ThemedText`、`ThemeProvider`、`Pane`、`ProgressBar` 等）
- [ ] 读 `src/components/messages/`：transcript 行（User / AssistantText /
  AssistantThinking / AssistantToolUse / MessageMetadata）
- [ ] 读 `src/components/questions/`：`AskUserQuestionPanel`、`PlanReviewPanel`
- [ ] 选读 2~3 个功能组件：`PromptInput.tsx`（2157 行，输入区）、`MessageList.tsx`
  （1423 行）、`ModelPicker.tsx`、`ThemePicker.tsx` 等
- [ ] 理解组件如何只用 `ui.ts` 门面 + 主题键，不直接 import 上游包

**看什么**：组件层遵循「不直接拥有 Agent/session 真相」，颜色用语义主题键而非
孤立字面色。`design-system/` 是所有视觉的原语层，改动会影响全 UI——所以主题
原语的改动必须跑 CI 回归。

### 4.5 渲染门面与 Ink 内核

- [ ] 读 `src/ui.ts`：公共门面导出（render / Box / Text / hooks / ScrollBox /
  AlternateScreen / useInput…）
- [ ] 读 `src/ink/ink.tsx`（2269 行）与 `renderer.ts`：移植的 Ink 渲染管线
- [ ] 了解 `src/ink/` 子目录分工：`termio/`（终端协议：csi/dec/osc）、`events/`
  （输入事件）、`hooks/`（use-input 等）、`layout/`（Yoga 桥接）、`components/`
- [ ] 了解 `src/native-ts/yoga-layout/`：纯 TS 布局引擎
- [ ] 理解关键渲染机制：差分输出（每帧只写屏幕变化）、虚拟化消息列表、
  回放合并、有界缓存、终端能力探测
- [ ] 理解「终端宽度是显示单元宽度」：`stringWidth` / `wrap-text` / `sliceAnsi`
  等辅助（ANSI、组合字符、emoji、东亚宽字符）

**看什么**：`ink/` 是**敏感基础设施**（103 个文件的移植内核），改动要聚焦并附
渲染器专用回归。学习重点是**机制与边界**，不是逐行读。先掌握：渲染器把 React
树 → 布局 → ANSI 帧的流程；`termio/` 怎么发 CSI/DEC/OSC 序列；全屏/内联的
协议差异。参考 `docs/project-documentation/ink-core.md`、`rendering.md`
（注意基线过期提示）。

### 4.6 偏好、主题与持久化

- [ ] 通读 `src/theme.ts`（581 行）：`Theme` 契约、内置色板、`AUTO_THEME_NAME`
- [ ] 读 `src/themePrefs.ts` / `src/customTheme.ts`：主题选择与自定义主题解析
- [ ] 泛读一组 `*Prefs.ts`：`modelPrefs` / `presetPrefs` / `effortPrefs` /
  `tuiDisplayPrefs` / `activityPrefs` 等，理解「持久化用户偏好」模式
- [ ] 读 `src/sessionHistory.ts`：`~/.dsh-tui` 下的会话元数据与 `/resume` 目标
- [ ] 理解偏好优先级：显式部署配置/环境覆盖 > 持久化用户选择 > 检测/默认值

**看什么**：数据位置见 `docs/architecture.md`「持久化位置」表（`~/.dsh-tui/`）。
关键安全约定：主题名与文件内容当不可信输入；损坏的偏好文件要回退/警告，不能
让 TUI 崩溃；`0600/0700` 权限。

### 4.7 命令、i18n 与打包技能

- [ ] 读 `src/commands.ts` 全文（282 行）：`LocalCommand`、`CommandCompletion`、
  `LOCAL_COMMANDS`、`isLocalCommandName`
- [ ] 读 `src/i18n.ts`：`t()`、`cmd-desc-<name>` 字典约定（只写 zh，en 回退原文）
- [ ] 读 `src/dsh-adapter/packaged-skills.ts`：技能如何注册为确定性直调命令
  （#496），命令名必须等于 SKILL.md 的注册名（kebab-case）
- [ ] 翻一遍 `skills/*/SKILL.md`（audit / bug / pr-comments / practice /
  release-notes / review / vuln-check）
- [ ] 读 `src/dsh-adapter/packaged-presets.ts` 与 `presets/liangshen/`（随包 preset）

**看什么**：新增 slash 命令的完整改动面 = 声明 + 分发（Chat.tsx）+ 帮助/文档 +
i18n 描述 + 回归——对照 `docs/contributing.md` 的「跨文件修改清单」表。

### 4.8 CC 格式化与工具库

- [ ] 泛读 `src/cc/`：Claude Code 风格格式化（figures、format、sessionColors…）
- [ ] 泛读 `src/utils/`：keymap、clipboard、fullscreen、modifiers、paths、
  openExternal、urlGuard、mentions 等
- [ ] 选读 `src/theme.ts` + `src/utils/keymap.ts` 的常量/类型定义

**看什么**：这层是「低层可复用工具」，没有大逻辑，主要是熟悉仓库的宽度/切片/
ANSI/键位处理习惯，避免以后重复造轮子。

---

## 5. 阶段 4：动手实践（学以致用）

目标：动手改代码并用验证矩阵证明行为正确。**从易到难**，每个练习都带「看什么
文件 + 怎么验证」。

### Check List

- [ ] 练习 A：改一个主题键颜色，肉眼观察变化（design-system 原语）
- [ ] 练习 B：给 `src/commands.ts` 加一个本地 slash 命令，并同步 i18n 描述与帮助
- [ ] 练习 C：追踪一个 DSH 事件从 `channel.ts` 投影到屏幕的完整路径（写注释/笔记）
- [ ] 练习 D：为一个小改动写/扩展一个聚焦回归脚本
- [ ] 练习 E：复现并定位一个 issue（用 `repro-*.tsx` 环境）
- [ ] 练习 F：修一个 bug 并跑对应聚焦脚本 + 相关 CI 回归
- [ ] 练习 G：按生态规范写一个 TUI 插件（参考 `dsh-working-activity`）

### 详细说明

**练习 A（最简单，1~2 小时）**：找 `src/theme.ts` 里一个色板，改一个语义键的色值，
用 `pnpm smoke` 或真 TUI 看效果。验证：`node --import tsx/esm scripts/verify-themes.mjs`
（主题回归）。**记住：主题改动必须完整覆盖 `Theme` 契约，组件用语义键不用字面色。**

**练习 B（适合上手 channel/命令面）**：在 `src/commands.ts` 的 `LOCAL_COMMANDS`
加一条命令，在 `Chat.tsx` 找到分发点接线，在 `src/i18n.ts` 加 `cmd-desc-<name>`。
验证：跑 `node scripts/verify-queue.mjs` 之类 + 确认帮助菜单渲染。改动面清单对照
`docs/contributing.md` 的「跨文件修改清单」表。

**练习 C（理解数据流的核心练习）**：启动真 TUI 发一条消息，同时开着
`DSH_TUI_RENDER_LOG` 或读 JSONL 会话日志，追一个 `session/event` → `channel.ts`
投影 → `ChatRow` → 组件渲染。这会把你阶段 3 学的所有层串起来。

**练习 D（学习验证文化）**：选一个窄改动，仿照 `scripts/verify-*.mjs` 写一个
有界断言脚本（import `lib/types/` 的先 `pnpm build`；import `src/` 的头部声明
`node --import tsx/esm`）。注意：`scripts/` 里还有取证/交互工具（PTY 探针、
堆分析、回放捕获），**不要当套件全跑**，跑前读脚本头部。

**练习 E/F（进阶）**：在 `scripts/repro-*.tsx` 里挑一个贴近兴趣的复现环境，改参
数观察渲染输出；再挑一个已知 issue 尝试定位根因。终端可见改动要在 inline 与
fullscreen、窄终端宽度下手动走流程（启动、resize、滚动、输入、取消、干净退出）。

**练习 G（生态出口）**：参考官方生态指南（`docs/plugins.md` 与
[dsh-ecosystem-spec](https://github.com/T-Auto/dsh-ecosystem-spec) 的
`plugin-admission-and-development.md`）、模板仓库与参考实现 `dsh-working-activity`
（实时工作状态行：TUI 槽位 + `activity/status` 会话事件双出口）。

---

## 6. 阶段 5：验证与调试工具箱

目标：掌握「改完怎么证明没坏」与「出问题怎么查」。

### Check List

- [ ] 会跑构建门禁：`pnpm compile` / `pnpm build` / `pnpm verify:build` /
  `pnpm verify:package` / `pnpm smoke`
- [ ] 会跑 CI 三大回归：`scripts/repro-askpanel.tsx`、
  `scripts/verify-askpanel-layout.tsx`、`scripts/repro-toolcards.tsx`
- [ ] 会按改动面选聚焦脚本（见下方对照表）
- [ ] 会用调试路径：`DSH_TUI_DEBUG=1`、`DSH_TUI_RENDER_LOG=/path`
- [ ] 会用 TUI 内自检：`/doctor`、`/config`、`/permissions`
- [ ] 知道哪些脚本是「取证/交互工具」不该全跑（PTY 探针、堆分析、回放、性能探针）
- [ ] 会在真实 TTY 做端到端集成检查（插件装进 DSH profile 跑
  `dsh --profile dsh-tui`）

### 详细说明

**门禁命令**（CI 等价物，改完必跑）：

```sh
pnpm compile
pnpm verify:build    # 边界/契约/manifest-deps/patch-surface/plugin 系列/i18n 等
pnpm verify:package  # npm tarball 目标完整 + 入口 smoke import
pnpm smoke           # 通用无头屏幕组装冒烟
```

**聚焦脚本对照表**（改动面 → 验证，摘自 `docs/contributing.md`）：

| 改动区域 | 聚焦验证 |
| --- | --- |
| Channel submit/steer/pending | `node scripts/verify-submit.mjs` |
| 提示队列行为 | `node scripts/verify-queue.mjs` |
| Goal/todo 投影与渲染 | `verify-channel-goal-todo.mjs` + `verify-goal-todo.mjs` |
| Compaction/折叠 transcript | `node scripts/verify-compact.mjs` |
| 压缩 × 会话切换生命周期 | `node --import tsx/esm scripts/verify-compact-switch.tsx` |
| 主题加载与持久化 | `node --import tsx/esm scripts/verify-themes.mjs` |
| 滚动/粘底 | `verify-scroll.mjs`、`verify-resticky.mjs` 及 `repro-*` |
| 全屏复制即选区 | `node scripts/verify-copy-on-select.mjs` |

**经验法则**：多数 `node` 直接跑的脚本 import `lib/types/`（先 `pnpm build`）；
带 `node --import tsx/esm` 的 import `src/`。**不要凭扩展名推断输入层**（例如
`verify-themes.mjs` 其实经 tsx import `src/`）。

**调试路径**：

- `DSH_TUI_DEBUG=1 dsh --profile dsh-tui` → stderr 调试（不污染 TUI stdout）
- `DSH_TUI_RENDER_LOG=/path/render.log` → 原始 ANSI 帧捕获（分享前必须脱敏）
- `scripts/run.ts`（`pnpm tui`）假定包位于 DSH monorepo 布局内，不是可移植冒烟命令
- PTY/复现：`scripts/pty-*.mjs`、`repro-*.tsx` 针对特定终端/场景

**手动验证流程**（终端可见改动）：inline + fullscreen 两种模式、窄终端宽度下走
启动 → resize → 滚动 → 输入 → 取消 → 干净退出；Windows ConPTY、tmux、OSC 剪贴板
与同步输出有独立路径，改它们时用对应探针。

---

## 7. 阶段 6：贡献与生态（可选进阶）

目标：把学习成果转化成合规的贡献。

### Check List

- [ ] 理解功能提案流程：先 Discussion，被认可后才有跟踪 issue；「拿到认可前不要
  开始写代码」（被否清单里有 OAuth、`/cost`、通知、插件 API、remote runtime）
- [ ] 理解 PR 规则：base 指向 `main`、一个 PR 一个逻辑改动、中文或中英对照标题、
  review 前先跑验证矩阵
- [ ] 会做跨文件同步（对照 `docs/contributing.md` 的修改清单表）
- [ ] 会做发布安全：不擅自 commit/tag/push/publish；发布由 `v*` tag 驱动且必须
  与 `package.json` 版本一致
- [ ] （可选）了解生态插件开发：`docs/plugins.md`、ecosystem 模板、参考实现
- [ ] （可选）了解打包技能与 preset：`skills/*`、`presets/liangshen/`

### 详细说明

- **功能提案**：只发到 [Discussions Ideas](https://github.com/ccch1mneyyy/dsh-TUI/discussions/new?category=ideas)，
  Issues 不接受功能请求；14 天无回应可直接提 PR（会标 `unreviewed-proposal`）。
- **Git 安全**：只暂存显式路径（`git add <path>`），不用 `git add .`/`-A`；不跑
  破坏性清理命令（`reset --hard`、`checkout .`、`clean -fd`）；编辑前检查
  `git status` 与相关 diff，保留他人无关改动。
- **提交前检查**：`git diff --check`、源码 diff、生成 diff、`git status`，并如实
  报告跑了哪些验证、哪些平台/凭证相关的检查没跑。
- **文档同步**：用户可见行为要在 `README.md` 与 `README_EN.md` 双语同步；快捷键、
  配置、命令、主题、渲染器、打包技能的跨文件同步清单见 `docs/contributing.md`。

---

## 8. 里程碑自检（学完如何确认）

每个阶段完成后，能对下列问题脱口而出，才算过关：

**阶段 1 后**：
- [ ] 我能说出 dsh-tui 的核心能力与 5 个以上 slash 命令的作用
- [ ] 我知道 inline 与 fullscreen 的区别

**阶段 2 后**：
- [ ] 我能默写出从 Cordis 配置到 ANSI 终端的完整链路
- [ ] 我能解释「Session 是真源」为什么成立，以及谁负责投影
- [ ] 我能说出三条红线并给出反例

**阶段 3 后**：
- [ ] 我能指出「一条新 slash 命令」需要改哪些文件（声明/分发/i18n/文档/回归）
- [ ] 我能解释 `channel.ts` 里工具结果为何按 `callId` 关联
- [ ] 我能说出为什么 `ink/` 改动要附渲染器专用回归
- [ ] 我能说出偏好优先级顺序与数据文件位置

**阶段 4 后**：
- [ ] 我独立完成过至少一个练习并跑通过对应验证
- [ ] 我亲手追踪过一条事件从 session 日志到屏幕的路径

**阶段 5 后**：
- [ ] 我能按改动面选对聚焦脚本，而不是全跑 `scripts/`
- [ ] 我知道何时用 `DSH_TUI_DEBUG`、何时用 `DSH_TUI_RENDER_LOG`

---

## 9. 学习资源速查（一条龙）

| 想学 | 看哪里 |
| --- | --- |
| 项目定位/总览 | [README.md](../../README.md)、[docs/project-documentation/overview.md](../project-documentation/overview.md) |
| 安装与启动 | [docs/getting-started.md](../getting-started.md) |
| 使用手册/键位/命令 | [docs/user-guide.md](../user-guide.md)、[docs/interaction.md](../interaction.md) |
| 配置/Cordis/preset | [docs/configuration.md](../configuration.md) |
| 主题 | [docs/themes.md](../themes.md)、`src/theme.ts` |
| 架构与限制 | [docs/architecture.md](../architecture.md) |
| 开发契约/验证矩阵 | [docs/contributing.md](../contributing.md) |
| 上游边界 | [ADAPTER.md](../../ADAPTER.md) |
| 生命周期/装配 | [docs/project-documentation/lifecycle.md](../project-documentation/lifecycle.md)（旧基线，注意路径迁移） |
| Ink 渲染内核 | [docs/project-documentation/ink-core.md](../project-documentation/ink-core.md)、`src/ink/` |
| 渲染与性能 | [docs/project-documentation/rendering.md](../project-documentation/rendering.md) |
| 输入与命令系统 | [docs/project-documentation/input-commands.md](../project-documentation/input-commands.md) |
| 模型路由/状态栏 | [docs/project-documentation/model-route.md](../project-documentation/model-route.md) |
| 会话持久化 | [docs/project-documentation/session-context.md](../project-documentation/session-context.md) |
| 生态插件开发 | [docs/plugins.md](../plugins.md)、[dsh-ecosystem-spec](https://github.com/T-Auto/dsh-ecosystem-spec) |
| 打包技能 | `skills/*/SKILL.md`、`src/dsh-adapter/packaged-skills.ts` |
