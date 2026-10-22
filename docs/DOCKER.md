# Docker 打包与部署

镜像包含构建后的游戏和 Node 管理服务，支持后台登录、保存故事与通关邮件卡片。使用 Docker Engine 或 Docker Desktop，并安装 **Docker Compose V2**（命令为 `docker compose`）。

## 用 Compose 启动

在项目根目录确认 `config/admin.json` 存在。仓库当前默认配置为：

```json
{
  "adminKey": "whoops2026"
}
```

`./config` 以只读目录挂载到容器的 `/app/config`，密钥不会打包进镜像。容器使用 `node` 用户（UID 1000）运行；Linux 主机上的目录需允许该用户进入，`admin.json` 需允许该用户读取。正式对外使用前修改默认密钥。

```bash
docker compose up -d --build
docker compose ps
```

- 游戏：`http://localhost:3000/`
- 管理员入口：`http://localhost:3000/studio.html`

用配置中的密钥登录，填写素材并点击「保存到游戏」。部署到远程服务器时，将 `localhost` 换成实际访问地址。

临时改为宿主机 8080 端口：

```bash
APP_PORT=8080 docker compose up -d --build
```

容器内仍监听 3000 端口。若要长期使用自定义端口或访问前缀，在项目根目录的 `.env` 中维护下面的非密钥配置；已有 `.env` 时修改对应行即可：

```dotenv
APP_PORT=8080
BASE_PATH=/memory-arcade/
```

`.env` 已被 Git 忽略。管理员密钥仍放在 `config/admin.json`，不要写入构建参数。

## 子目录部署

例如部署到 `/memory-arcade/`：

```bash
BASE_PATH=/memory-arcade/ docker compose up -d --build
```

默认端口下，游戏地址变为 `http://localhost:3000/memory-arcade/`，后台为 `http://localhost:3000/memory-arcade/studio.html`。若 `.env` 已配置该值，直接使用 `docker compose up -d --build`。

Compose 将 `BASE_PATH` 作为构建参数传入，Dockerfile 同时把它写入前端资源路径和最终镜像的环境变量。**更改访问前缀必须重建镜像**；不要在启动现有镜像时单独覆盖 `BASE_PATH`。前缀应以 `/` 开头和结尾，例如 `/` 或 `/memory-arcade/`。

## 更新、日志与停止

更新代码后重建并替换容器：

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 -f app
```

修改宿主机 `config/admin.json` 后重启服务即可，不必重建镜像：

```bash
docker compose restart app
```

重启会使登录会话失效，需要重新输入密钥；已发布故事保留。

```bash
# 停止并移除容器，保留已发布内容的数据卷
docker compose down
```

发布内容位于容器 `/app/.data/content.json`，Compose 使用命名卷 `memory-arcade_content-data` 持久化。更新、重建容器以及普通 `down` 都不会删除该卷。**不要误用 `docker compose down -v`：它会删除数据卷及其中已发布的故事、图片与礼物内容。**

## 迁移与备份内容

本地项目原有的 `.data/` 不会自动进入新容器。可先在原工作室导出草稿 JSON，再到容器工作室「导入草稿」，核对后点击「保存到游戏」。已有本地草稿可能与发布内容不同，备份发布版本时先选择「载入游戏当前内容」再导出。

也可直接复制运行中服务的发布文件：

```bash
mkdir -p .data/backups
docker compose cp app:/app/.data/content.json .data/backups/content-backup.json
```

只有首次成功「保存到游戏」后才会生成该文件。备份目录已被 Git 和 Docker 构建上下文忽略。恢复时优先使用后台导入备份 JSON，再保存到游戏；导入本身只替换草稿，不会立即发布。备份包含照片、信件和礼物说明，请单独妥善保管，不要提交到 Git。

## 只使用 docker build / run

以下方式与 Compose 二选一，避免两个服务同时修改同一个内容卷：

```bash
docker build --build-arg BASE_PATH=/ -t memory-arcade:local .
docker volume create memory-arcade_content-data
docker run -d \
  --name memory-arcade \
  --init \
  --restart unless-stopped \
  -p 3000:3000 \
  --mount "type=bind,src=$(pwd)/config,dst=/app/config,readonly" \
  --mount type=volume,src=memory-arcade_content-data,dst=/app/.data \
  memory-arcade:local
```

在项目根目录执行，确保 `config/admin.json` 已存在且可读。子目录部署时改构建参数，运行命令无需额外设置 `BASE_PATH`。镜像不包含管理员密钥和发布内容，因此每次独立部署都需要准备配置挂载与持久化卷。

## 搬运镜像到服务器

构建完成后可导出镜像，无需推送镜像仓库：

```bash
docker save -o /tmp/memory-arcade-image.tar memory-arcade:local
```

将该文件复制到目标服务器，再加载：

```bash
docker load -i /tmp/memory-arcade-image.tar
```

目标服务器另行准备 `config/admin.json`，然后使用上面的 `docker run` 命令；也可复制 `compose.yaml` 和所需 `.env` 后执行 `docker compose up -d --no-build`。镜像导出不会包含挂载的配置或内容数据卷，故事需要通过备份单独恢复。

镜像架构需匹配服务器。若在 Apple Silicon 上构建、目标是 x86 Linux，可使用下面的命令生成对应镜像后再导出：

```bash
docker buildx build --platform linux/amd64 --build-arg BASE_PATH=/ -t memory-arcade:local --load .
```

## 运行边界

当前会话保存在单个 Node 进程内，请使用单实例部署，不要将这个服务扩展成多个副本。管理员保存依赖 Node API，不能用纯静态 Nginx 容器替代；可在它前面增加反向代理，保留原站点 `Host` 并启用 HTTPS。更多访问控制、备份和发布注意事项见 [发布说明](RELEASING.md)。

## 基础镜像下载失败

如果 Docker Hub 的下载域名无法解析，可从 Docker 官方镜像的 [ECR 公共入口](https://gallery.ecr.aws/docker/library/node) 拉取 Node，再复用本地镜像构建：

```bash
docker pull public.ecr.aws/docker/library/node:24-alpine
docker tag public.ecr.aws/docker/library/node:24-alpine node:24-alpine
docker compose build
```

打包采用 [Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/)，持久化使用 [Docker 命名卷](https://docs.docker.com/engine/storage/volumes/)。
