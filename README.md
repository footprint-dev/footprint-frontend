# Footprint Frontend

从 Footprint Serverless 拆出的独立地图控制台。保留 React、Mapbox、时间轴、轨迹表格和项目编辑功能，可独立安装、测试和构建，无需 Cloudflare 账号、Wrangler 或原项目目录。

浏览器访问本项目的同源 `/api/*`。开发时由 Vite 提供代理，生产时由附带的 Node 服务提供静态资源和代理，通过 HTTP 调用现有 CF API Worker。API 和 D1 沿用现有部署，接口路径、参数、分页和响应格式保持兼容。

```text
浏览器 → Vite / Node 服务 → 现有 API Worker → D1
             │
             └─ 提供地图公开配置，服务端保存 INGEST_TOKEN
```

## 开发

需要 Node.js 24+ 和 pnpm 11.28.5。

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

在 `.env` 中填写：

```dotenv
API_BASE_URL=https://your-existing-api.workers.dev
INGEST_TOKEN=与现有API相同的Token
MAPBOX_PUBLIC_TOKEN=pk.你的Mapbox公开Token
```

`API_BASE_URL` 是 **API Worker 的公网 origin**，可使用它的自定义域名；不要填写原 Console 的域名，也不要追加 `/api`。开发时也可设为 `http://127.0.0.1:8787`，连接原项目的本地 API。

```bash
pnpm dev
```

打开 `http://127.0.0.1:5173`。开发服务器默认只监听本机，不要求控制台登录。环境变量覆盖 `.env`；修改配置后重启服务。配置只读取本项目的 `.env`，不读取相邻项目的私有文件。

## 独立构建与部署

```bash
pnpm build
```

静态产物位于 `dist/`，构建不需要 API 地址、Token 或 Mapbox 配置，也不构建、部署 API。地图配置在运行时加载，因此同一份构建可连接不同的 CF API。

使用附带的生产服务：

```dotenv
# .env，补充在前面的 API 和地图配置之后
CONSOLE_USERNAME=footprint
CONSOLE_PASSWORD=设置你自己的控制台登录密码
HOST=127.0.0.1
PORT=3000
```

```bash
pnpm start
```

打开 `http://127.0.0.1:3000`，使用上述用户名和密码登录。生产服务使用 Node 标准库，可将 `dist/`、`server/`、`package.json` 放到另一台安装 Node.js 24+ 的机器，配置 `.env` 后直接执行 `node server/start.ts`；运行时无需安装前端构建依赖。

通过 HTTPS 反向代理访问时设置 `PUBLIC_ORIGIN=https://你的控制台域名`，用于校验项目写入请求。入口已有登录保护时，可设置 `CONSOLE_AUTH=external` 交由入口鉴权；该设置本身不校验入口身份。公开服务应由 HTTPS 入口提供访问。

`pnpm preview` 在 `http://127.0.0.1:4173` 预览构建结果，采用与开发服务器相同的本机访问方式。自行托管 `dist/` 时，需要提供下面的同源接口；Vite 代理和运行时配置接口不包含在静态文件内。

## 与现有 CF API 的兼容边界

| 浏览器接口 | 行为 |
| --- | --- |
| `GET /api/console-config` | 本项目返回 `{ mapboxToken, mapboxStyle, localPreview }`，不转发至 CF |
| `GET /api/me`、`GET /api/location` | 按原路径和查询参数转发至 API Worker |
| `GET /api/locations` | 保留 `view`、`order`、`limit`、`offset` 等参数及 `locations`、`pagination` 响应 |
| `GET /api/projects`、`GET /api/projects/:name` | 保留原项目查询接口 |
| `POST /api/projects`、`PATCH /api/projects/:id` | 原样转发项目 JSON，保留 `201` / `200`、`project` 和错误响应 |

网关使用 `Authorization: Bearer <INGEST_TOKEN>` 调用 CF API，API Token 不发送到浏览器。浏览器的登录凭据、Cookie、旧 `Token` 头和 Access JWT 不转发给 API。位置上报仍由原客户端直接调用 API Worker；控制台代理仅开放轨迹读取和项目管理，与原 Console 权限范围一致。

生产访问使用本项目的登录保护，无需 Cloudflare Access；不再使用 Service Binding。保留同源 `/api` 后，现有 CF API 无需增加浏览器 CORS 支持。请将新控制台域名加入 Mapbox 公开 Token 的允许范围。

## 检查

```bash
pnpm check
```

包含 TypeScript 检查、原有地图/时间轴/时区/项目逻辑测试、配置测试、HTTP 代理集成测试和生产构建。代理测试通过本地 HTTP 上游验证现有浏览器 API 客户端的分页读取、项目新增/修改、鉴权替换与错误响应，不访问生产 CF 或真实轨迹数据。

```text
src/                地图控制台
public/             公开静态资源
server/config.ts    本项目的环境配置
server/gateway.ts   运行时地图配置、控制台鉴权、CF API HTTP 代理
server/app.ts       生产静态资源服务
server/start.ts     生产启动入口
test/               前端逻辑和 HTTP 集成测试
```
