# Footprint Frontend

从 Footprint Serverless 拆出的独立地图控制台。保留 React、Mapbox、时间轴、轨迹表格和项目编辑功能，可独立安装、测试和构建，无需 Cloudflare 账号、Wrangler 或原项目目录。

浏览器访问本项目的同源 `/api/*`. 开发时由 Vite 提供代理, 生产时由附带的 Node 服务提供静态资源和代理, 通过 HTTP 调用 `API_BASE_URL` 指定的后端. `API_BACKEND` 决定使用 Serverful 或 Serverless 的认证处理方式.

```text
浏览器 -> Vite / Node 服务 -> Serverful API -> PostgreSQL
                         -> Serverless API Worker -> D1

Vite / Node 服务提供地图公开配置, 仅为 Serverless 保存和添加 API Token.
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
INGEST_TOKEN=your-serverless-token

MAPBOX_PUBLIC_TOKEN=pk.你的Mapbox公开Token
```

`API_BACKEND` 可设为 `serverless` 或 `serverful`, 默认 `serverless`, 只控制认证处理方式. 切换后端时, 手动修改 `API_BASE_URL` 和 `API_BACKEND`, 然后重启服务. `pnpm dev`, `pnpm preview` 和 `pnpm start` 使用同一配置.

`API_BASE_URL` 默认以已部署的 Serverless API 公网地址举例, 请将 `https://your-footprint-api.workers.dev` 替换成实际 API Worker 的 origin, 不要填写 Console 域名或追加 `/api`. 切换到本地 Serverful 时, 将地址改为 `http://127.0.0.1:8080`, 并设置 `API_BACKEND=serverful`. 生产服务要求填写 `API_BASE_URL`.

Serverless 模式需要填写 `INGEST_TOKEN`, 与原 API Worker 的 `INGEST_TOKEN` 一致. 代理使用它添加 Bearer Token. Serverful 模式不配置或注入 API Token, 不启用前端控制台登录, 浏览器的 `Authorization` 和 Cookie 交给后端校验. 当前 Go 后端仍要求合法的 Bearer 凭据, 未认证请求会返回 `401`.

Vite 的 `server.proxy` 将 `/api/*` 原样转发至所选后端. `/api/console-config` 由前端插件提供地图公开配置. `pnpm preview` 使用相同的代理配置.

```bash
pnpm dev
```

打开 `http://127.0.0.1:5173`。开发服务器默认只监听本机，不要求控制台登录。环境变量覆盖 `.env`；修改配置后重启服务。配置只读取本项目的 `.env`，不读取相邻项目的私有文件。

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

# Required only for serverless with the default CONSOLE_AUTH=basic.
CONSOLE_USERNAME=footprint
CONSOLE_PASSWORD=设置你自己的控制台登录密码
```

```bash
pnpm start
```

打开 `http://127.0.0.1:3000`. Serverless 模式使用上述用户名和密码登录, Serverful 模式由后端认证. 生产服务使用 Node 标准库, 可将 `dist/`, `server/`, `package.json` 放到另一台安装 Node.js 24+ 的机器, 配置 `.env` 后直接执行 `node server/start.ts`; 运行时无需安装前端构建依赖.

通过 HTTPS 反向代理访问时设置 `PUBLIC_ORIGIN=https://你的控制台域名`, 用于校验项目写入请求. Serverless 模式下, 入口已有登录保护时可设置 `CONSOLE_AUTH=external` 交由入口鉴权; 该设置本身不校验入口身份. 公开服务应由 HTTPS 入口提供访问.

`pnpm preview` 在 `http://127.0.0.1:4173` 预览构建结果，采用与开发服务器相同的本机访问方式。自行托管 `dist/` 时，需要提供下面的同源接口；Vite 代理和运行时配置接口不包含在静态文件内。

## 后端接口

| 浏览器接口 | 行为 |
| --- | --- |
| `GET /api/console-config` | 本项目返回 `{ mapboxToken, mapboxStyle, localPreview }`, 不转发至后端 |
| `GET /api/me`, `GET /api/location` | 按原路径和查询参数转发至所选后端 |
| `GET /api/locations` | 保留 `view`、`order`、`limit`、`offset` 等参数及 `locations`、`pagination` 响应 |
| `GET /api/projects`、`GET /api/projects/:name` | 保留原项目查询接口 |
| `POST /api/projects`、`PATCH /api/projects/:id` | 原样转发项目 JSON，保留 `201` / `200`、`project` 和错误响应 |

Serverless 模式使用服务端的 `INGEST_TOKEN` 设置 `Authorization: Bearer <token>`, 该 Token 不发送到浏览器, 浏览器的登录凭据, Cookie, 旧 `Token` 头和 Access JWT 不转发给 API. Serverful 模式透传浏览器的 `Authorization` 和 Cookie, 并返回后端的 `Set-Cookie` 和认证结果. 生产 Node 服务仅开放轨迹读取和项目管理, 位置上报由原客户端直接调用后端. 本机 Vite 开发和预览服务代理 `/api/*` 业务请求.

Serverless 的生产访问使用本项目的登录保护, 无需 Cloudflare Access 或 Service Binding. Serverful 的认证由后端负责. 保留同源 `/api` 后, 后端无需增加浏览器 CORS 支持. 请将新控制台域名加入 Mapbox 公开 Token 的允许范围.

## 检查

```bash
pnpm check
```

包含 TypeScript 检查、原有地图/时间轴/时区/项目逻辑测试、配置测试、HTTP 代理集成测试和生产构建。代理测试通过本地 HTTP 上游验证现有浏览器 API 客户端的分页读取、项目新增/修改、鉴权替换与错误响应，不访问生产 CF 或真实轨迹数据。

```text
src/                地图控制台
public/             公开静态资源
server/config.ts    本项目的环境配置
server/gateway.ts   运行时地图配置, 控制台鉴权, 后端 API HTTP 代理
server/app.ts       生产静态资源服务
server/start.ts     生产启动入口
tests/              前端逻辑和 HTTP 集成测试
```
