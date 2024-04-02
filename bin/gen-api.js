#!/usr/bin/env node
const path = require("path");
const GenApi = require("../src/index");
const {
  getFileData,
  createfolderFile
} = require("../src/utils/index");
let configPath = "";
const fs = require("fs");
let docsWebs = [];

docsWebs = fs
  .readdirSync(path.join(process.cwd(), "src", "core"))
  .map((file) => {
    return file.replace(".js", "")
  });

// 获取配置文件的数据
const [configData, axiosData] = getFileData(
  "src/config/api.config.js",
  "src/config/axios.js"
);

switch (process.argv[2]) {
  // 初始化配置文件
  case "init":
    if (fs.existsSync(path.join(process.cwd(), "api.config.js"))) {
      console.log("配置文件已存在");
      process.exit();
    }

    // 创建配置文件
    const initPath = path.join(process.cwd(), "api.config.js");
    fs.writeFileSync(initPath, configData, "utf8");
    console.log("初始化配置文件成功" + initPath);
    // 创建axios文件
    if (process.argv[3] == "--axios") {
      if (!process.argv[4]) {
        console.log("请传入你的路径！");
        process.exit();
      }
      createfolderFile(process.argv[4], axiosData);
      console.log("创建axios文件成功");
    }
    process.exit();
  // 自定义配置文件路径
  case "--p":
    if (!process.argv[3]) {
      console.log("请传入你的路径！");
      process.exit();
    }
    configPath = process.argv[3];
    if (!fs.existsSync(path.join(process.cwd(), configPath))) {
      console.log(
        "找不到配置文件,请使用命令 gen-api --c <path> 创建你的配置文件路径! "
      );
      process.exit();
    }
    break;
  // 创建自定义配置文件
  case "--c":
    if (!process.argv[3]) {
      console.log("请传入你的路径！");
      process.exit();
    }
    configPath = process.argv[3];
    // 创建配置文件
    if (fs.existsSync(path.join(process.cwd(), process.argv[3]))) {
      console.log("配置文件已存在");
      process.exit();
    }
    const cPath = path.join(process.cwd(), configPath);
    fs.writeFileSync(cPath, configData, "utf8");
    console.log("配置文件创建成功" + cPath);
    process.exit();

  case "-v":
    console.log(require("../package.json").version);
    process.exit();
}

if (fs.existsSync(path.join(process.cwd(), "api.config.js"))) {
  configPath = "api.config.js";
} else if (process.argv[3]) {
  configPath = process.argv[3];
} else {
  console.log("找不到配置文件，请使用 gen-api init 命令初始化配置文件");
  process.exit();
}

// 读取配置文件
const configs = require(path.join(process.cwd(), configPath));
configs.genApiName = configs.genApiName || 'yapi'
if (!docsWebs.includes(configs.genApiName)) {
  console.log(`不支持该${configs.genApiName}在线API网站`);
  process.exit();
}


if (Array.isArray(configs.projects) && !configs.projects.length) {
  console.log("projects必填!");
  process.exit();
}

// 创建需要生成在线文档的api
GenApi.createGenApi(configs);
