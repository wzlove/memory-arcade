# 发布说明

默认发布的是「拾光小盒」三消游戏，旧版平台闯关保留在 `?mode=platformer`。配置入口见 [README](../README.md)。

## 准备内容

- 在 `src/content/story.js` 中填写六段回忆、信件、礼物和小鹅彩蛋，保留六条回忆及现有唯一 ID。
- 在 `src/components/MatchGame.jsx` 中修改新玩法的首页标题、开场白和署名；`PROJECT` 只影响旧版。
- 同步 `index.html` 的标题、描述，以及 `public/manifest.webmanifest` 的应用名称和描述。
- 图片放入 `public/content/`，更新 `photo` / `image` 路径及替代文本，检查手机显示与文件大小。
- 使用已获授权的图片与文案；私人照片发布前检查人物许可及 EXIF/GPS 信息。

游戏不会实际下单或兑换礼物，领取安排由赠送者完成。礼物说明不要放不可公开的兑换码、密码或访问令牌。

## 仓库与网站的权限

仓库设为私有只控制源码访问，不自动限制网站访问。`package.json` 中的 `private: true` 只防止误发布到 npm，也不会改变 GitHub 仓库可见性。

如果仓库仍属于公开 fork，不能直接更改为私有；需先将它转换为独立仓库。脱离 fork 网络是不可逆操作，可能丢失 issue、PR 等元数据，先确认保留需求并阅读 [GitHub 脱离 fork 说明](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/detaching-a-fork)，不要直接删除仓库。

普通 GitHub Pages 网站公开可访问，即使源码仓库为私有。若故事只允许特定的人阅读，部署平台必须提供身份验证或其他访问控制。游戏内的关卡锁和本地存档校验不是安全边界。

## 更新离线缓存

[`public/sw.js`](../public/sw.js) 使用静态 `CORE` 清单预缓存六张回忆图、终章图、礼物图等文件。

1. 替换图片文件名或格式时，同步更新 `CORE`；保留旧版需要的 `finale.svg`，或同步替换其配置与缓存路径。
2. 确保清单内的文件均存在。任何一个预缓存文件返回错误都可能使 Service Worker 安装失败。
3. 修改故事、图片或页面后递增 `CACHE` 名称，例如从 `memory-arcade-match-v2` 改为 `memory-arcade-match-v3`。
4. 部署后联网重新打开站点，等待新 Service Worker 完成安装，再刷新并核对新内容；断网后重新打开确认素材可用。

离线缓存与游戏存档是两套数据。更新缓存版本不会主动清空 `localStorage`；「清除站点数据」则会同时丢失游戏进度。生产构建才注册 Service Worker，测试请使用 `npm run preview` 或 HTTPS 站点。

## 构建与部署

使用 Node.js 24（与 `.nvmrc` 和 CI 一致）：

```bash
npm ci
npm run check
npm run preview
```

`check` 包含两种玩法的测试和生产构建。预览检查完成后，将 `dist/` 内的文件部署到静态托管服务。`npm run preview` 不作为生产服务器使用。

### GitHub Pages

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

将产物放到对应的 `/memory-arcade/` 目录。启用 HTTPS，核对首页、JS、CSS、图片、manifest 和 `sw.js` 的请求路径。需要私密访问时，配置托管平台或服务器的访问控制。

## 上线验收

- 在桌面键盘和手机触屏上完成「三盒 → 六段回忆 → 信 → 礼物 → 小鹅彩蛋」。
- 最后一盒应为 36 件、6 种物品，显示下层提示，提供 3 次辅助与 5 次撤回。
- 确认槽位满时可以恢复或重试；重试保留回忆并恢复次数，撤回和刷新不退还已用次数。
- 刷新后确认进度保留；完整重开前有确认提示，取消不清空进度。
- 若改过布局或存档结构，验证旧存档迁移；已经进入信件或礼物的旧存档应保持解锁。
- 检查收藏夹、长文案、信件和礼物在窄屏可阅读，弹层按钮可操作；检查键盘焦点、替代文本和减少动态效果。
- 确认默认静音、手动开启声音可用；联网更新与断网缓存均正常。
- 打开同一站点的 `?mode=platformer`，确认保留的旧版入口正常。
- 更换域名或浏览器不会自动迁移进度，发送新链接前向试玩者说明。
