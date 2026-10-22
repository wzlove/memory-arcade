# 发布说明

默认发布的是「拾光小盒」三消游戏，旧版平台闯关保留在 `?mode=platformer`。配置入口见 [README](../README.md)。

## 准备内容

使用 Node 服务时，可在 `/studio.html` 登录后按引导填写故事、信件和礼物，补齐必填项并点击「保存到游戏」。自动保存的本地草稿、导出的 JSON 都不会自行发布；保存成功后，玩家重新打开或刷新默认三消游戏即可读取新内容，已有进度保留。旧版平台闯关仍读取源码内置素材。

采用纯静态部署或要修改内置默认故事时：

- 在 `src/content/story.js` 中填写六段回忆、信件、礼物和小鹅彩蛋，保留六条回忆及现有唯一 ID。
- 在 `src/content/gameContent.js` 的 `DEFAULT_GAME_CONTENT` 中修改新玩法默认昵称、首页标题、开场白和署名；`PROJECT` 只影响旧版。
- 同步 `index.html` 的标题、描述，以及 `public/manifest.webmanifest` 的应用名称和描述。
- 图片放入 `public/content/`，更新 `photo` / `image` 路径及替代文本，检查手机显示与文件大小。
- 使用已获授权的图片与文案；私人照片发布前检查人物许可及 EXIF/GPS 信息。

游戏不会实际下单或兑换礼物，领取安排由赠送者完成。通关拆礼物后的邮件卡片支持「生成图片」：在浏览器本地生成 PNG，打开图片预览后可下载，手机可长按保存；长信件按完整行自动分页，每张单独下载。仍保留「下载 HTML」，不发送邮件，无需邮箱或 SMTP 配置。礼物说明不要放不可公开的兑换码、密码或访问令牌；管理员登录只控制修改，完整内容仍可由客户端读取。

## 仓库与网站的权限

仓库设为私有只控制源码访问，不自动限制网站访问。`package.json` 中的 `private: true` 只防止误发布到 npm，也不会改变 GitHub 仓库可见性。

如果仓库仍属于公开 fork，不能直接更改为私有；需先将它转换为独立仓库。脱离 fork 网络是不可逆操作，可能丢失 issue、PR 等元数据，先确认保留需求并阅读 [GitHub 脱离 fork 说明](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/detaching-a-fork)，不要直接删除仓库。

普通 GitHub Pages 网站公开可访问，即使源码仓库为私有。若故事只允许特定的人阅读，部署平台必须提供身份验证或其他访问控制。游戏内的关卡锁和本地存档校验不是安全边界。

## 更新离线缓存

[`public/sw.js`](../public/sw.js) 使用静态 `CORE` 清单预缓存六张回忆图、终章图、礼物图等文件。

1. 替换图片文件名或格式时，同步更新 `CORE`；保留旧版需要的 `finale.svg`，或同步替换其配置与缓存路径。
2. 确保清单内的文件均存在。任何一个预缓存文件返回错误都可能使 Service Worker 安装失败。
3. 修改故事、图片或页面后递增 `CACHE` 名称，例如从 `memory-arcade-match-v2` 改为 `memory-arcade-match-v3`。
4. 部署后联网重新打开站点，等待新 Service Worker 完成安装，再刷新并核对新内容与素材。

离线缓存、游戏存档与已发布内容是不同的数据。更新缓存版本不会主动清空 `localStorage`；「清除站点数据」会丢失游戏进度及本地工作室草稿。管理页面和 API 不进入 Service Worker 缓存，已发布故事的读取与管理需要联网；不要把离线缓存当作服务端内容备份。生产构建才注册 Service Worker，静态资源检查可使用 `npm run preview`，完整管理流程需使用 `npm start`。

## 构建与部署

使用 Node.js 24（与 `.nvmrc` 和 CI 一致）：

```bash
npm ci
npm run check
npm run preview
```

`check` 包含测试和生产构建。`npm run preview` 仅预览静态产物，不支持管理员登录与保存，也不作为生产服务器使用。按是否需要后台配置，选择下面的部署方式。

### Docker Compose

项目提供 `Dockerfile`、`compose.yaml` 和 `.dockerignore`，支持游戏与管理员 API 一起部署：

```bash
docker compose up -d --build
docker compose ps
```

默认端口为 3000。`config/` 只读挂载，已发布内容存入独立数据卷；更新时重新执行第一条命令，勿使用会删除数据卷的 `down -v`。构建前确认配置文件可被容器内的 Node 用户读取；子目录前缀修改后必须重新构建镜像。完整步骤、备份及镜像搬运方式见 [Docker 部署说明](DOCKER.md)。

### Node 服务：可通过后台配置

在项目根目录保留 `server/`、`public/studio-model.js`、`config/admin.json` 和 `dist/`。修改配置文件中的 `adminKey`：默认 `whoops2026` 可用于首次本地登录，正式部署请替换为自己的值，不要提交实际生产密钥。修改密钥后重启服务。

```bash
npm run build && npm start
```

默认游戏入口为 `http://localhost:3000/`，管理员入口为 `/studio.html`。启动时可设置 `PORT`（默认 `3000`）、`HOST`（默认 `0.0.0.0`）及 `BASE_PATH`（默认 `/`）。子目录部署必须在构建与启动时使用相同前缀：

```bash
BASE_PATH=/memory-arcade/ npm run build
BASE_PATH=/memory-arcade/ HOST=127.0.0.1 PORT=3000 npm start
```

此时管理员入口为 `/memory-arcade/studio.html`。使用进程管理器保持服务运行，通过反向代理启用 HTTPS，并保留原站点 Host。生产服务仅提供 `dist/` 静态文件与管理 API，不要把整个仓库作为静态目录公开。

管理员会话有效期为 8 小时，保存在当前 Node 进程中；重启后需要重新登录。当前部署适合单实例，多实例需要另行接入共享会话和存储。

### 发布内容的备份与恢复

- 已发布配置及内嵌图片保存在 `.data/content.json`；该目录已忽略 Git，不随代码推送或 Pages 部署同步。
- 更新代码与 `dist/` 时保留 `.data/`。容器或临时磁盘部署需将该目录挂载到持久化存储，并允许 Node 进程读写。
- 定期备份 `.data/content.json`，也可登录工作室，载入游戏当前内容后导出 JSON。自动保存的浏览器草稿可能尚未发布，备份时确认要保存哪一版。
- 服务器恢复时停止服务，替换 `.data/content.json` 后重启；也可在后台导入 JSON，检查后重新点击「保存到游戏」。
- 文件不存在时使用内置默认故事；文件损坏时显示读取错误，需要恢复备份，不会用示例掩盖异常。更换域名或浏览器不会自动迁移本地草稿与玩家进度。

### GitHub Pages

Pages 只发布构建时的默认故事，不运行 Node 管理服务；`/studio.html` 无法登录或保存，服务端 `.data/content.json` 也不会自动进入产物。

1. 确认账号支持目标仓库的 Pages：免费方案支持公开仓库，私有仓库需要相应付费方案。
2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 检查 [部署工作流](../.github/workflows/deploy-pages.yml) 的 `BASE_PATH`：项目站点用 `/仓库名/`（已有自动配置），根站点和自定义域名用 `/`。
4. 合入并推送到 `main` 后，检查 **Deploy to GitHub Pages** 的 build 和 deploy 均成功。
5. 从 Pages 设置页获取实际链接，不要将原作者的演示地址当成本仓库的发布地址。

官方参考：[Pages 发布设置与可用方案](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Vite 静态部署与路径配置](https://vite.dev/guide/static-deploy.html)。

### 自有服务器或其他静态托管

根目录部署使用 `npm run build`；子目录部署使用：

```bash
BASE_PATH=/memory-arcade/ npm run build
```

将产物放到对应的 `/memory-arcade/` 目录。此方式只运行默认游戏，不支持管理 API；需要后台配置请使用 Node 服务。启用 HTTPS，核对首页、JS、CSS、图片、manifest 和 `sw.js` 的请求路径。需要私密访问时，配置托管平台或服务器的访问控制。

## 上线验收

- 在桌面键盘和手机触屏上完成「三盒 → 六段回忆 → 信 → 礼物 → 小鹅彩蛋」。
- 拆礼物后生成并下载 PNG，核对昵称、署名、信件和礼物内容；检查长信件分页没有丢字、截断文字，手机图片预览可长按保存。
- 检查礼物图片加载失败时有提示，仍可生成保留完整文字的卡片；HTML 下载可打开阅读，小鹅彩蛋只在揭晓后随卡片保存，确认没有发送邮件的操作。
- Node 部署检查错误密钥被拒绝、正确密钥可登录；自动草稿不会改变游戏，「保存到游戏」后用另一浏览器打开游戏确认生效。
- 检查退出或服务重启后必须重新登录，已发布内容仍保留；确认配置文件和 `.data/` 不能通过静态 URL 下载。
- 静态部署检查默认故事可玩，管理入口明确显示服务不可用，不声称发布成功。
- 最后一盒应为 36 件、6 种物品，显示下层提示，提供 3 次辅助与 5 次撤回。
- 确认槽位满时可以恢复或重试；重试保留回忆并恢复次数，撤回和刷新不退还已用次数。
- 刷新后确认进度保留；完整重开前有确认提示，取消不清空进度。
- 若改过布局或存档结构，验证旧存档迁移；已经进入信件或礼物的旧存档应保持解锁。
- 检查收藏夹、长文案、信件和礼物在窄屏可阅读，弹层按钮可操作；检查键盘焦点、替代文本和减少动态效果。
- 确认默认静音、手动开启声音可用；联网更新资源正常，管理 API 不被离线缓存。
- 打开同一站点的 `?mode=platformer`，确认保留的旧版入口正常。
- 更换域名或浏览器不会自动迁移进度，发送新链接前向试玩者说明。
