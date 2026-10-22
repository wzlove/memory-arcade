# Memory Arcade / 拾光小盒

一款送给特定的人的惊喜消除游戏，适合生日、纪念日或告白。玩家整理三个回忆盒子，收集六段故事，完成最后的挑战后读信、拆礼物。

默认入口是「藏在日常里的你」。项目基于 React + Vite，使用 2D 插画卡片堆叠；无需后端、数据库、账号或 API 密钥。仓库自带虚构故事和原创 SVG 示例素材，可以先运行，再换成你们的回忆。

## 快速开始

推荐 Node.js 24，`.nvmrc` 和 GitHub Actions 使用同一版本。依赖支持 Node.js 22.12+（22.x）、24.x 或 26+，不再支持 Node.js 20。

```bash
# 使用 nvm 时先运行 nvm install，再运行 nvm use
npm ci
npm run dev
```

打开终端显示的地址即可游玩。验证和预览构建产物：

```bash
npm run check
npm run preview
```

`check` 执行测试和生产构建，产物位于 `dist/`。`preview` 只用于本地验收，不是生产服务器。

## 玩法与惊喜流程

```text
打开第一个盒子 → 整理日常小物 → 回忆 1、2
打开第二个盒子 → 整理旅行小物 → 回忆 3、4
挑战最后一个盒子 → 回忆 5、6 → 全部消除
读信 → 拆开礼物 → 摸摸小鹅，发现额外彩蛋
```

点击每列最上层的小物，放入七格收纳槽；三个相同的小物自动消除。槽位满且未能消除时，需撤回、辅助配组或重试当前盒子。全程不计时，没有付费道具。

| 盒子 | 小物数量 | 辅助配组 | 撤回 | 特点 |
| --- | --- | --- | --- | --- |
| 随手收集的小东西 | 18 件 | 不限次数 | 不限次数 | 熟悉收纳与消除 |
| 一起经过的地方 | 36 件 | 不限次数 | 不限次数 | 逐步发现回忆 |
| 礼物前的最后一关 | 36 件、6 种 | 每次挑战 3 次 | 每次挑战 5 次 | 交错堆叠，可查看下一层物品 |

- 每盒消除一半和全部时各解锁一段回忆，可在收藏夹重温。
- 「帮我配一组」会从收纳槽和盒子里凑齐三个同类物品，可能取出被遮挡的小物。
- 最后一盒必须全部消除才能读信、拆礼物；已有无需辅助的参考解法，测试会验证三关均可完成。
- 重试当前盒子会恢复辅助和撤回次数，保留已发现的回忆；撤回或刷新不会退还已用次数。
- 礼物页可以再次挑战最后一关；完整重开需确认，会清空三个盒子的进度与回忆。

声音默认关闭，可手动开启。支持触屏、键盘 Tab / Enter、对话框 Escape 关闭和减少动态效果偏好。当前不包含 3D 物理、摇晃手机、真实下单或礼品兑换服务。

## 准备你的故事

| 素材 | 建议准备 |
| --- | --- |
| 开场 | 对方昵称、你的署名、赠送场景、一句开场白 |
| 六段回忆 | 每段的标题、时间描述、几句话及一张图片；也可保留示例插画 |
| 通关后的信 | 3～5 段想对对方说的话 |
| 最终礼物 | 名称、说明、图片及领取方式 |
| 小鹅彩蛋 | 一份额外的小奖励，例如电影任选券 |

目前通过修改源码配置内容，没有后台编辑器。修改后需重新构建部署。

| 要改什么 | 修改位置 |
| --- | --- |
| 六段回忆 | [`src/content/story.js`](src/content/story.js) 的 `MEMORIES`：`chapter`、`date`、`title`、`body`、`photo`、`alt`、`accent` |
| 通关后的信 | 同文件的 `FINALE.letter`，数组每项是一段 |
| 礼物 | 同文件的 `REWARDS.gift`：`title`、`description`、`image`、`imageAlt`、`details` |
| 小鹅彩蛋 | 同文件的 `REWARDS.voucher.revealTitle` 和 `description` |
| 新玩法首页标题、开场白、信件署名 | [`src/components/MatchGame.jsx`](src/components/MatchGame.jsx) |
| 浏览器标题与网页描述 | [`index.html`](index.html) |
| 添加到主屏幕后的名称与描述 | [`public/manifest.webmanifest`](public/manifest.webmanifest) |
| 图片与图标 | [`public/content/`](public/content/)、`public/favicon.svg` |
| 物品名称、布局与辅助次数 | [`src/content/match.js`](src/content/match.js)；修改布局后需重新验证可解性与旧存档兼容性 |

`story.js` 中的 `PROJECT` 和 `FINALE` 里除 `letter` 外的字段用于旧版平台闯关，不会修改新玩法的标题或增加告白问答。

请保留六条回忆及现有唯一 `id`，数组顺序就是阅读顺序。`accent` 可选 `rose`、`gold`、`ocean`、`green`。已有存档按序号记录解锁状态；发布后调整回忆顺序会改变玩家已解锁的内容。

例如，把照片放到 `public/content/memory-01.webp`，再修改第一条回忆：

```js
photo: contentAsset('memory-01.webp'),
alt: '一起在海边散步的照片',
```

图片名称变化时，还要同步 [`public/sw.js`](public/sw.js) 的 `CORE` 缓存清单，并递增 `CACHE` 名称。清单仍引用已删除的 SVG 会导致离线缓存安装失败；只改图片内容也要更新缓存版本，避免显示旧素材。详见[发布说明](docs/RELEASING.md)。

## 进度与离线使用

新玩法通过 `localStorage` 保存棋盘、撤回记录、已用辅助次数、回忆和结局，刷新可续玩。存储键为 `memory-arcade-match-v1`，当前数据版本为 `3`。前两关的旧存档可继续；旧版未完成的第三关会重置为当前布局并保留回忆，已进入信件或礼物的存档保持解锁。

进度仅属于当前浏览器和站点地址，不跨设备同步；更换域名、清理站点数据或使用无痕窗口可能无法继续原进度。存储不可用时仍能玩，但不会保存。小鹅彩蛋的展开状态和声音开关不会保存。

生产构建包含 Service Worker。通过 HTTPS（本地测试可用 localhost）首次成功加载并完成缓存后，可离线使用；开发模式不注册 Service Worker。

## 部署

仓库地址：[wzlove/memory-arcade](https://github.com/wzlove/memory-arcade)。游戏访问地址以实际托管平台的部署结果为准。

### GitHub Pages

项目已有 [Pages 工作流](.github/workflows/deploy-pages.yml)，推送到 `main` 或手动触发后会安装依赖、运行测试、构建并部署。

1. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
2. 将改动合入并推送到 `main`。
3. 查看 **Actions → Deploy to GitHub Pages** 的结果，成功后从 Pages 设置页获取链接。

当前工作流自动把 `BASE_PATH` 设置成 `/仓库名/`。若使用 `用户名.github.io` 根站点或自定义域名，将工作流中的 `BASE_PATH` 改为 `/`；只改 `vite.config.mjs` 的默认值不会覆盖工作流环境变量。[路径配置说明](https://vite.dev/guide/static-deploy.html)

GitHub Free 的 Pages 面向公开仓库；私有仓库需要支持该功能的付费方案。私有仓库不等于私密网站，普通 Pages 站点仍公开可访问。[GitHub Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### 其他静态托管或自有服务器

```bash
# 部署在域名根目录
npm run build

# 如果部署在 /memory-arcade/ 子目录，改用这一条构建
BASE_PATH=/memory-arcade/ npm run build
```

上传 `dist/` 内的文件到对应网站目录，启用 HTTPS。服务器只需提供静态文件，不需要运行 Node 后端。需要仅指定的人访问时，选择带身份验证的托管服务或在服务器配置访问控制。

## 原版平台闯关

原版「拾光冒险」保留在同一站点的 `?mode=platformer` 入口，例如本地的 `http://localhost:5173/?mode=platformer`（端口以终端显示为准）。

旧版通过移动、跳跃和顶砖寻找六枚记忆碎片，再抵达终点读信、回答最终问题。隐藏房与代金券属于额外支线，不影响主线通关。旧版不保存闯关进度，刷新会重开；与默认三消玩法的存档相互独立。两种玩法共用 `story.js` 中的回忆、信件和奖励素材。

基于 [juliantanx/memory-arcade](https://github.com/juliantanx/memory-arcade) 改造，保留原项目的 MIT 许可证。

## 项目结构

```text
src/App.jsx                   # 根据 URL 选择玩法
src/PlatformerApp.jsx          # 原版平台闯关入口
src/components/MatchGame.jsx   # 三消界面、回忆与礼物
src/components/KeepsakeArt.jsx # 小物 SVG 插画与图标
src/content/story.js          # 两种玩法共用的故事素材
src/content/match.js          # 三消物品、关卡与参考解法
src/game/MatchGame.js          # 三消规则与存档校验、迁移
src/game/MatchGame.test.js     # 三消规则测试
src/game/                     # 同时保留旧版游戏引擎与音频
src/match.css                 # 三消页面样式
public/content/               # 回忆和礼物素材
public/sw.js                  # 生产环境离线缓存
.github/workflows/            # CI 与 Pages 部署
```

## 隐私、贡献与许可证

照片、信件和礼物内容会随静态文件一起发布，通关解锁不提供加密或访问控制。请使用获授权的素材，不要在前端配置或 Git 历史中保存真实密钥、兑换凭证或其他不应公开的信息。

- [发布说明与验收清单](docs/RELEASING.md)
- [贡献指南](CONTRIBUTING.md)
- [安全问题报告](SECURITY.md)
- [MIT 许可证](LICENSE)：覆盖代码与原创示例素材，个人上传素材需另行确认权利。
