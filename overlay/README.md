# DualSense OBS Overlay

透明背景的 3D 手柄 overlay。你的代码发一条消息，对应按钮就会高亮，效果和手动按下一样。真实手柄的输入也会同时显示。

只在本机使用：服务只监听 `127.0.0.1`，不会随网站一起发布。

## 启动

```bash
npm install
```

```bash
npm run overlay
```

然后在 OBS 里添加「浏览器」来源，地址填 `http://127.0.0.1:8765/`，宽高建议 800×600。

想检查是否连通，保持 overlay 打开，再运行下面的命令，它会依次按下所有按钮：

```bash
npm run overlay:demo
```

## 从代码触发

有两种方式，消息内容相同：

- **HTTP：** `POST http://127.0.0.1:8765/input`，适合偶尔触发，任何语言都能用。
- **WebSocket：** 连接 `ws://127.0.0.1:8765/ws`，适合高频发送。连接断开时，所有代码按下的按键会自动松开。

```bash
curl -X POST http://127.0.0.1:8765/input -d "{\"button\":\"cross\",\"hold\":150}"
```

Python（只用标准库）：

```python
import json, urllib.request

def send(command):
    request = urllib.request.Request("http://127.0.0.1:8765/input", data=json.dumps(command).encode())
    urllib.request.urlopen(request).close()

send({"button": "cross", "hold": 150})
```

## 消息格式

| 消息 | 作用 |
| --- | --- |
| `{"button":"cross","hold":150}` | 按下 150 毫秒后自动松开 |
| `{"button":"cross"}` | 按下并保持 |
| `{"button":"cross","value":0}` | 松开 |
| `{"button":"r2","value":0.5}` | 模拟量，范围 0 到 1，扳机可用 |
| `{"stick":"left","x":1,"y":0,"hold":300}` | 推摇杆，`x`、`y` 范围 -1 到 1，`y` 向下为正 |
| `{"stick":"left","x":0,"y":0}` | 摇杆回中 |
| `{"release":"all"}` | 松开所有由代码按下的输入 |
| `[{...},{...}]` | 一次发送多条 |

按钮名称：`cross` `circle` `square` `triangle` `l1` `r1` `l2` `r2` `create` `options` `l3` `r3` `up` `down` `left` `right` `ps` `touchpad` `mute`

**防止按键卡住：** 没有写 `hold` 的按下，默认 10 秒后自动松开。需要长按时，每隔几秒重发一次同样的消息就会重新计时。也可以用 `?safety=` 修改时长，`?safety=0` 表示关闭。

## 页面参数

加在地址后面，例如 `http://127.0.0.1:8765/?color=ff3366&view=angle`：

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `color` | 高亮颜色，6 位十六进制，不带 `#` | `ffbf47` |
| `opacity` | 高亮强度，0 到 100 | `100` |
| `view` | 视角：`front` `angle` `back` `triggers` `shoulders` | `front` |
| `zoom` | 缩放 | `1` |
| `finish` | 外壳：`white` `black` `red` | `white` |
| `light` | 手柄灯颜色，6 位十六进制 | 蓝色 |
| `physical` | 设为 `0` 时不读取真实手柄 | 读取 |
| `safety` | 防卡住时长，单位毫秒 | `10000` |
| `debug` | 设为 `1` 时显示连接状态 | 不显示 |

端口可以通过环境变量 `PORT` 修改。

## 关于真实手柄

OBS 浏览器源可能读不到真实手柄，这不影响代码触发。如果读不到，可以用 Chrome 打开这个地址，再用 OBS 的窗口捕获。
