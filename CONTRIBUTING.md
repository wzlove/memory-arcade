# Contributing

感谢你改进 Memory Arcade / 拾光小盒。默认入口是三消惊喜游戏，原版平台闯关保留在 `?mode=platformer`。

1. 在有访问权限的仓库中从 `main` 创建分支；公开仓库也可以先 Fork。
2. 不要在 issue、提交、测试数据或截图中加入真实私人信息。
3. 使用 Node.js 24，执行 `npm ci` 和 `npm run check`。
4. 提交聚焦、可复现的 Pull Request，并说明行为变化。

新增素材必须由贡献者原创、属于公有领域，或使用与本项目兼容且允许再分发的许可证。请在 Pull Request 中注明来源和许可证。不要提交商业游戏的角色、精灵图、关卡复刻、音频或商标素材。

修改三消规则或布局时，更新 `src/game/MatchGame.test.js` 中相关验证，确保参考解法可完成关卡，并检查辅助次数、回忆解锁与旧存档兼容性。修改共用的 `story.js` 或组件时，同时检查两种玩法。

修改图片文件名或发布内容时，同步 `public/sw.js` 的缓存清单与版本。说明入口见 [README](README.md)，发布步骤见 [docs/RELEASING.md](docs/RELEASING.md)。
