# Footprint Frontend

从 Footprint Serverless 拆出的独立地图控制台。保留 React、Mapbox、时间轴、轨迹表格和项目编辑功能，可独立安装、测试和构建，无需 Cloudflare 账号、Wrangler 或原项目目录。

浏览器访问本项目的同源 `/api/*`. 开发时由 Vite 提供代理, 生产时由附带的 Node 服务提供静态资源和代理, 通过 HTTP 调用 `API_BASE_URL` 指定的后端. `API_BACKEND` 决定地图配置来源.

```text
浏览器 -> Vite / Node 服务 -> Serverful API -> PostgreSQL
                         -> Serverless API Worker -> D1

Serverless 的地图配置由 Vite / Node 服务提供.
Serverful 的地图配置由 Go 后端提供.
业务请求使用用户在页面设置中输入的 Token.
```

## 开发

需要 Node.js 24+ 和 pnpm 11.28.5。

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

在 `.env` 中填写:

```dotenv
# Allowed values: serverless (default) or serverful.
API_BACKEND=serverless
# Replace this example with your deployed API Worker's public origin.
# For Serverful, use http://127.0.0.1:8080 and set API_BACKEND=serverful.
API_BASE_URL=https://your-footprint-api.workers.dev
# Used only for serverless.
MAPBOX_PUBLIC_TOKEN=pk.你的Mapbox公开Token
```

`API_BACKEND` 可设为 `serverless` 或 `serverful`, 默认 `serverless`, 决定地图配置来源. 切换后端时, 手动修改 `API_BASE_URL` 和 `API_BACKEND`, 然后重启服务. `pnpm dev`, `pnpm preview` 和 `pnpm start` 使用同一配置.

`API_BASE_URL` 默认以已部署的 Serverless API 公网地址举例, 请将 `https://your-footprint-api.workers.dev` 替换成实际 API Worker 的 origin, 不要填写 Console 域名或追加 `/api`. 切换到本地 Serverful 时, 将地址改为 `http://127.0.0.1:8080`, 并设置 `API_BACKEND=serverful`. 生产服务要求填写 `API_BASE_URL`.

页面可直接打开. 点击右上角的设置按钮, 输入后端的 Token 并保存. Serverful 使用 Go 后端 `config.toml` 中的 `[server] ingest_token`, Serverless 使用 API Worker 的访问 Token. 保存前会调用 `/api/me` 校验, 成功后自动获取地图配置并加载足迹数据. 页面未配置 Token 时不会请求地图配置或业务数据; 清除 Token 时也会清除当前地图配置.

Token 仅保存在当前浏览器标签页的 `sessionStorage`, 刷新页面后仍可使用, 关闭标签页后清除. 在设置中留空并保存也可清除 Token. 浏览器为轨迹读取和项目写入请求添加 `Authorization: Bearer <token>`, 代理将其转发给后端校验.

Vite 的 `server.proxy` 将 `/api/*` 原样转发至所选后端. 地图配置请求携带用户输入的 Bearer Token. Serverless 模式先调用上游 `/api/me` 校验身份, 通过后由前端服务返回 `MAPBOX_PUBLIC_TOKEN` 和 `MAPBOX_STYLE`. Serverful 模式将此请求转发给 Go 校验并返回配置, 前端的地图环境变量不生效; 请在后端 `config.toml` 中配置:

```toml
[mapbox]
public_token = "pk.your-public-token"
style = "mapbox://styles/mapbox/light-v11"
```

`pnpm dev`, `pnpm preview` 和 `pnpm start` 均使用上述配置来源. Go 嵌入静态前端时, 浏览器继续请求同源 `./api/console-config`, 地图配置在 Go 启动时加载.

```bash
pnpm dev
```

打开 `http://127.0.0.1:5173`. 开发服务器默认只监听本机. 环境变量覆盖 `.env`; 修改配置后重启服务. 配置只读取本项目的 `.env`, 不读取相邻项目的私有文件.

## 独立构建与部署

```bash
pnpm build
```

静态产物位于 `dist/`, 构建不需要 API 地址, Token 或 Mapbox 配置, 也不构建或部署 API. 地图配置在运行时加载, 因此同一份构建可连接 Serverful 或 Serverless 后端.

使用附带的生产服务:

```dotenv
# Add to the API and map configuration in .env.
HOST=127.0.0.1
PORT=3000
```

```bash
pnpm start
```

打开 `http://127.0.0.1:3000`, 在页面设置中输入 Token 后访问业务数据. 生产服务使用 Node 标准库, 可将 `dist/`, `server/`, `package.json` 放到另一台安装 Node.js 24+ 的机器, 配置 `.env` 后直接执行 `node server/start.ts`; 运行时无需安装前端构建依赖.

通过 HTTPS 反向代理访问时设置 `PUBLIC_ORIGIN=https://你的控制台域名`, 用于校验项目写入请求. 公开服务应由 HTTPS 入口提供访问.

`pnpm preview` 在 `http://127.0.0.1:4173` 预览构建结果，采用与开发服务器相同的本机访问方式。自行托管 `dist/` 时，需要提供下面的同源接口；Vite 代理和运行时配置接口不包含在静态文件内。

## 后端接口

| 浏览器接口                                      | 行为                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/console-config`                       | 认证后获取地图配置; Serverless 校验上游身份后返回, Serverful 转发至 Go          |
| `GET /api/me`, `GET /api/location`              | 按原路径和查询参数转发至所选后端                                                |
| `GET /api/locations`                            | 保留 `view`、`order`、`limit`、`offset` 等参数及 `locations`、`pagination` 响应 |
| `GET /api/projects`、`GET /api/projects/:name`  | 保留原项目查询接口                                                              |
| `POST /api/projects`、`PATCH /api/projects/:id` | 原样转发项目 JSON，保留 `201` / `200`、`project` 和错误响应                     |

## 检查

```bash
pnpm check
```

使用 `pnpm format` 格式化项目代码. Prettier 使用项目内的开发依赖版本, 跳过 `.gitignore` 中的文件及生成的 `pnpm-lock.yaml`.

包含 TypeScript 检查, 地图/时间轴/时区/项目逻辑测试, 配置测试, HTTP 代理集成测试和生产构建. 代理测试通过本地 HTTP 上游验证浏览器 API 客户端的 Token 校验, 分页读取, 项目新增/修改, 凭据转发与错误响应, 不访问生产 CF 或真实轨迹数据.

```text
src/App.tsx         页面组件组装
src/components/     地图, 数据面板, 弹窗和基础界面组件
src/hooks/          Token 与数据加载, 筛选及页面交互状态
src/lib/            API 客户端, 数据模型和纯函数
src/styles/         布局, 时间轴, 面板和响应式样式
public/             公开静态资源
server/config.ts    本项目的环境配置
server/gateway.ts   运行时地图配置, 后端 API HTTP 代理
server/app.ts       生产静态资源服务
server/start.ts     生产启动入口
tests/              前端逻辑和 HTTP 集成测试
```

## 许可证

本项目采用 [GNU Affero General Public License v3.0](LICENSE), SPDX 标识为 `AGPL-3.0-only`.
