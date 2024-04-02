const ora = require("ora");
const puppeteer = require("puppeteer");
const inquirer = require("inquirer");
const prettier = require("prettier");
const path = require("path");
const fs = require("fs");
const { getFilenames, toCamelCase,getRes } = require("./index");
const cacheKey = require(path.join(process.cwd(), "package.json"));
global.Generator = class Generator {
  constructor(config, puppeteerOpt) {
    this.config = config;
    // 存放apiFilePath 下所有的文件名
    this.files = [];
    this.cacheKey = cacheKey;
    this.projectNames = [];
    // 接口所有的名称
    this.apiNames = [];
    // 当前第几项
    this.curNum = (num = 1) => num;
    // 导入封装的接口名称
    let name = /import (.*?) from/.exec(config.importRequestName)?.[1];
    name?.includes("{")
      ? (name = name.replace(/{|}/g, "").split(",")[0])
      : name;
    this.requestName = name;
    // 接口总共的数量
    this.totalApiNames = [];
    // 接口所有的菜单名称
    this.names = [];
    // 选择的文件名
    this.selectName = "";
    // 生成缓存数据的文件
    this.apiDataText = "api.data.json";
    // 账号
    this.userName = config.users.userName;
    // 密码
    this.passWord = config.users.passWord;
    this.cookies = [];
    // 缓存
    this.apiDataJson = {};
    this.apis = [];
    getFilenames(
      path.join(process.cwd(), "src/" + (config.apiFilePath || "api")),
      (filename) => {
        this.files.push(filename);
      }
    );

    this.getApiDataJson();
    (async () => {
      this.browser = await puppeteer.launch({
        ...{
          // headless: false,
          defaultViewport: null,
          args: ["--start-maximized"],
          ignoreDefaultArgs: ["--enable-automation"],
          // devtools: true,
          // slowMo: 5,
        },
        ...puppeteerOpt,
      });
      this.berforeInit(config);
    })(this);

    this.spinner = ora({
      text: `正在生成中...`,
      spinner: {
        interval: 80,
        frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
      },
    }).start();
    if (!this.userName || !this.passWord) {
      this.spinner.fail("账号或密码不能为空");
      process.exit();
    }
  }
  berforeInit() {
    this.config.projects.reduce(async (promise, item, index) => {
      if (typeof item == "object" && !item.projectId) {
        spinner.fail(`projectId不能为空:`);
        process.exit();
      }
      await promise;
      await this.init(
        typeof item == "object" ? item : { projectId: item },
        index
      );
      if (!fs.existsSync(path.join(process.cwd(), this.apiDataText))) {
        fs.writeFileSync(
          path.join(process.cwd(), this.apiDataText),
          JSON.stringify({
            [this.cacheKey.name]: [],
          })
        );
      }

      this.getApiDataJson();

      this.apiDataJson.selectName = this.selectName;

      if (!this.apiDataJson[this.cacheKey.name]?.[index]) {
        this.apiDataJson[this.cacheKey.name][index] = {};
      }
      if (item.catIds && Array.isArray(item.catIds)) {
        // 不存在则创建
        this.apiDataJson[this.cacheKey.name][index].ids = item.catIds;
      } else {
        this.apiDataJson[this.cacheKey.name][index].pid = item;
      }
      fs.writeFileSync(
        path.join(process.cwd(), this.apiDataText),
        JSON.stringify(this.apiDataJson)
      );
      if (index == this.config.projects.length - 1) {
        this.spinner.succeed(`接口已全部生成完毕:`);
        console.log(
          `总共生成接口${this.totalApiNames.join(",")}共${this.totalApiNames.length}个接口`
        );
        process.exit();
      }
    }, Promise.resolve());
  }
  getApiDataJson() {
    if (!fs.existsSync(path.join(process.cwd(), this.apiDataText))) {
      fs.writeFileSync(
        path.join(process.cwd(), this.apiDataText),
        JSON.stringify({ [this.cacheKey.name]: [] })
      );
    } else {
      // 如果当前yapi.data.json不存在认为第一次进来
      const data = fs.readFileSync(
        path.join(process.cwd(), this.apiDataText),
        "utf-8"
      );
      if (!data) {
        fs.writeFileSync(
          path.join(process.cwd(), this.apiDataText),
          JSON.stringify({ [this.cacheKey.name]: [] })
        );
      }
      if (data) {
        //  如果存在取出yapi.data.json的数据
        this.apiDataJson = data ? JSON.parse(data) : {};
        if (this.apiDataJson.selectName) {
          this.selectName = this.apiDataJson.selectName;
        }
      }
    }
  }
  setHeader(desc, path, apiNames, url) {
    return `/* 
  引入:import {${apiNames}} from '@${path}'
  */        
  ${this.config.importRequestName}
    `;
  }

  setRequestTemplate(opt) {
    const { paramsName, annotation, requestFunc } = Object.assign(
      {
        paramsName: "",
        annotation: "",
        requestFunc: "",
      },
      this.config.requestOpt
    );
    const newpParamsName =
      typeof paramsName == "function"
        ? paramsName(opt)
        : opt.restFul || paramsName || "data";

    return `
  
    ${
      typeof annotation == "function"
        ? annotation(opt)
        : `/* 
    *@项目名称:${opt.projectName}
    *@菜单名称:${opt.title}(${opt.url}) 
  */`
    }
    export function ${opt.apiName}(${newpParamsName}) { 
       ${
         typeof requestFunc == "function"
           ? opt.requestFunc(opt)
           : opt.requestFunc
             ? opt.requestFunc
             : `return ${this.requestName}({ url: \`${opt.path}\`,method:'${opt.method}',${!opt.restFul ? ` ${newpParamsName}` : `${""}`}})
          
          `
       }
      }
    `;
  }

  log(...args) {
    args.forEach((item) => {
      if (typeof item == "function") {
        if (item()) {
          console.log(item());
        }
      } else {
        console.log(item);
      }
    });
  }
  async gen(message) {
    if (message) {
      const { type } = await inquirer.prompt([
        {
          type: "list",
          message,
          name: "type",
          choices: this.files,
        },
      ]);
      this.selectName = type;
      this.readFiles = fs.readFileSync(this.selectName, "utf-8");
      this.paths = this.readFiles
        .split("\n")
        .map((item) => {
          if (/^url/.test(item.trim())) {
            return item
              .split(":")[1]
              .replace(/'|"/g, "")
              .replace(",", "")
              .replace(" ", "");
          }
        })
        .filter((item) => item);
    }
    return {
      add: (data, isRepeat = true) => {
        data.list.forEach((item, lIndex) => {
          this.log(`正在生成第${this.curNum(lIndex + 1)}项...`, () => {
            if (data.list.length - 1 == lIndex) return "生成完毕";
          });

          if (isRepeat) {
            // 如果没有重复的项则生成
            if (!this.paths.some((p) => item.path == p)) {
              let restFul = "";
              // 替换掉特殊字符串
              item.path = item.path.replace(/(\{\w+\})/g, (value) => {
                restFul = value.replace(/\{|\}/g, "");
                return "$" + value;
              });

              // 转为驼峰命名
              let apiName =
                (this.config.getRequestFunctionName &&
                  this.config.getRequestFunctionName(
                    toCamelCase(item.path, item, toCamelCase)
                  )) ||
                (this.config.getRequestFunctionName &&
                  this.config.getRequestFunctionName(
                    toCamelCase(item.path, item, toCamelCase)
                  )) ||
                toCamelCase(item.path);

              apiName = toCamelCase(
                apiName
                  .replace("${" + restFul, "by")
                  .replace("}", "/" + restFul)
              );
              this.apiNames.push(apiName);
              this.totalApiNames.push(apiName);
              this.names.push(item.title);
              this.apis.push(
                this.setRequestTemplate({
                  title: item.title,
                  method: item.method.toLocaleLowerCase(),
                  apiName,
                  requestFunc: this.opt.requestFunc,
                  restFul,
                  projectName: `${this.projectName}(${this.apiUrl}/cat_${item.catid})`,
                  url: this.getUrl(item._id).menuUrl,
                  path: item.path,
                })
              );
            }
          }
        });

        return this;
      },
    };
  }
  async request(url) {
    return await getRes(this.page, url, this.spinner);
  }
  // 写入接口
  async writeApi() {
    if (
      this.config.projects.every(
        (item) => typeof item === "string" || typeof item === "number"
      )
    ) {
      if (this.index == this.config.projects.length - 1) {
        // 同步写入修改后的内容
        fs.writeFileSync(
          this.selectName,
          await prettier.format(this.apis.join("\n"), {
            parser: "babel",
          })
        );
      }
    } else {
      // 同步写入修改后的内容
      fs.appendFileSync(
        this.selectName,
        await prettier.format(this.apis.join("\n"), {
          parser: "babel",
        })
      );
      this.apis = [];
    }

    console.log(!this.paths.length ? "文件写入成功" : `文件更新成功`);
    this.spinner.succeed(
      `成功生成${this.projectName}项目(${this.names.length}个接口):`
    );
    console.log(`菜单标题:${this.names.join(",")}`);
    console.log(`生成接口名称:${this.apiNames.join(",")}`);

    this.apiNames = [];
    this.names = [];
    return this;
  }
  // 写入头部
  writeHeader() {
    console.log(!this.paths.length ? `正在写入文件中...` : `正在更新文件中...`);
    if (
      this.config.projects.every(
        (item) => typeof item === "string" || typeof item === "number"
      )
    ) {
      if (this.index == this.config.projects.length - 1) {
        // 加入最前面的头部
        this.apis.unshift(
          this.setHeader(
            this.projectName,
            this.selectName.replaceAll("\\", "/").match(/src(.*)$/)[1],
            this.totalApiNames.join(","),
            this.apiUrl
          )
        );
      }
    } else {
      if (!this.readFiles) {
        // 加入最前面的头部
        this.apis.unshift(
          this.setHeader(
            this.projectName,
            this.selectName.replaceAll("\\", "/").match(/src(.*)$/)[1],
            this.totalApiNames.join(","),
            this.apiUrl
          )
        );
      }
    }

    // 在文件内容中查找匹配项并进行替换
    const regex = /import\s*\{\s*([a-zA-Z,]+)\s*\}/;

    this.readFiles = this.readFiles.replace(regex, (match, group) => {
      // 在这里，group 就是大括号内的内容，你可以进行处理或替换
      return `import {${[...new Set([...group.split(","), ...this.totalApiNames])].join(",")}}`;
    });
    // 同步写入修改后的内容
    fs.writeFileSync(this.selectName, this.readFiles, "utf8");
    return this;
  }
  getUrl(catId) {}
  getData(url) {
    return new Promise((resolve, reject) => {
      this.page.on("response", async (response) => {
        if (response.url() === url && response.status() === 200) {
          const res = await response.json();
          if (res.errcode != 0) {
            spinner.fail(res.errmsg);
            process.exit();
          }
          resolve(res.data);
        }
      });
    });
  }
};
