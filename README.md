# AI4TranditionalCulture_Shadow_Puppetry

皮影戏相关资料与项目工作区，用于整理传统文化背景知识，并逐步开展 AI 与皮影戏结合的探索。

## 当前内容

- [皮影戏基础常识与背景知识](docs/皮影戏基础常识与背景知识.md)：定义、历史、制作、地方特色及参考来源。
- [版本管理约定](docs/版本管理约定.md)：分支、提交与日常同步方式。

## 皮影动作展示 Demo

直接在浏览器中打开 [demo/index.html](demo/index.html)，无需安装依赖或连接外部服务。

- 拖动戏台上的左手签、主签和右手签，或使用滑杆控制手臂与身体。
- 选择挥袖招手、信步登场、俯身行礼、拱手亮相与舒袖起舞，支持播放、暂停与归位。
- 调整灯光、动作速度，切换操纵杆显示；手柄获得焦点后可用方向键微调。
- 手机支持触摸拖动与上下排列的操作面板。

影人为原创 SVG 风格化示意，使用简化的二维关节运动，不代表特定流派的传统程式。Demo 不含唱腔和音乐。

开发检查与静态打包（需要 Node.js 18 或更新版本）：

```bash
npm test
npm run build
```

打包结果位于 `dist/`。也可在仓库根目录运行 `python -m http.server 8765`，访问 `http://localhost:8765/demo/`。测试覆盖动作几何和主要控制逻辑，不替代浏览器视觉与触摸验证。

## 目录

```text
docs/           背景资料与项目文档
demo/           无依赖 HTML / CSS / JavaScript 互动演示
scripts/        静态打包脚本
tests/          交互逻辑与动画检查
.gitignore      本地文件与敏感信息忽略规则
.gitattributes  文本文件换行规则
```

## 获取仓库

```bash
git clone https://github.com/codesknight/AI4TranditionalCulture_Shadow_Puppetry.git
cd AI4TranditionalCulture_Shadow_Puppetry
```

引用资料时保留来源链接与访问日期。外部图片、音视频、剧本等素材应核实授权后再提交；仓库当前未声明开源许可证。
