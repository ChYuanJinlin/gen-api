#!/usr/bin/env node
const ora = require("ora");
const puppeteer = require("puppeteer");
const inquirer = require("inquirer");
const prettier = require("prettier");
const path = require("path");
const fs = require("fs");
const { getFilenames, toCamelCase, getRes } = require("../utils/index");
// 存放apiFilePath 下所有的文件名
const files = [];
// 接口所有的名称
let apiNames = [];
// 接口总共的数量
const totalApi = [];
// 接口所有的菜单名称
let names = [];
// 选择的文件名
let selectName = "";
// 读取配置文件
const configs = require(path.join(process.cwd(), "yapi.config.js"));
// 账号
const email = configs.users.email;
// 密码
const password = configs.users.password;

// 默认域名
const domain = configs.domain || "http://api.doc.jiyou-tech.com";
// 获取接口列表
let apis = [];
let browser = null;
let page = null;
let spinner = null;
getFilenames(
  path.join(process.cwd(), "src/" + configs.apiFilePath || "src/api"),
  (filename) => {
    files.push(filename);
  }
);

// todo 项目是多个
const setHeader = (desc, path, apiNames, url) => {
  return `/* 
@项目名称: ${desc} 
@地址:${url}
引入:import {${apiNames}} from '@/${path}'
*/        
${configs.importRequestName || "import request from '@/utils/request'"}
  `;
};

const setRequestTemplate = (opt) => {
  if (configs.requestTemplate) {
    return configs.requestTemplate(opt);
  } else {
    return `
/* 
@菜单名称: ${opt.zhushi} 
@地址:${opt.url}
*/   
    export function ${opt.apiName}(${opt.method == "POST" ? "data" : "query"}) {
      return request({
        url: '${opt.path}',
        method:'${opt.method}',
        ${opt.method == "POST" ? "data" : "params"}:  ${
          opt.method == "POST" ? "data" : "query"
        }
      })
    }
    
    `;
  }
};
spinner = ora({
  text: `正在生成中...`,
  spinner: {
    interval: 80,
    frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  },
}).start();

(async () => {
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
    ignoreDefaultArgs: ["--enable-automation"],
    devtools: true,
    // slowMo: 5,
  });

  page = await browser.newPage();
  page.setDefaultTimeout(0);
  if (!email || !password) {
    spinner.fail("账号或密码不能为空");
    process.exit();
  }
  // yapi登录地址
  await page.goto(domain + "/login");

  await page.waitForSelector("#email", {
    timeout: 0,
  });
  try {
    // 输入账号密码
    await page.type("#email", email);
    await page.type("#password", password);
    await page.keyboard.press("Enter");
    const data = await getRes(page, domain + "/api/user/login", spinner);
  } catch (error) {
    spinner.fail("生成失败");
    throw new Error(error);
  }

  class Yapi {
    constructor() {
      this.curNum = (num = 1) => num;
      this.getUrl = (catId) => {
        return {
          projectUrl:
            domain + `/project/${this.projectId}/interface/api/cat_${catId}`,
          menuUrl: domain + `/project/${this.projectId}/interface/api/${catId}`,
          indexUrl: domain + `/project/${this.projectId}/interface/api`,
        };
      };
    }

    init(opt, index) {
      return new Promise(async (resolve, reject) => {
        this.projectId = opt.projectId;
        this.ids = opt.ids;

        try {
          let yapiUrl = "",
            paths = "",
            readFiles,
            projectName = "";
          // 监听当前接口返回数据

          this.getData(
            `${domain}/api/interface/list_menu?project_id=${opt.projectId}`
          ).then(async (menuList) => {
            spinner.stop();
            await page.waitForSelector(
              "#yapi > div > div.router-main > div.header-box.m-header.ant-layout-header > div > div.breadcrumb-container > div > span:nth-child(2) > span.ant-breadcrumb-link",
              {
                timeout: 0,
              }
            );

            projectName = await page.$eval(
              "#yapi > div > div.router-main > div.header-box.m-header.ant-layout-header > div > div.breadcrumb-container > div > span:nth-child(2) > span.ant-breadcrumb-link",
              (el) => el.innerText
            );
            if (!this.ids || !this.ids.length) {
              for (let index = 0; index < menuList.length; index++) {
                if (!selectName) {
                  const { type } = await inquirer.prompt([
                    {
                      type: "list",
                      message: `请选择需要生成所有接口的文件`,
                      name: "type",
                      choices: files,
                    },
                  ]);
                  selectName = type;
                }

                this.add(menuList[index]);
              }
            } else {
              for (let i = 0; i < this.ids.length; i++) {
                for (let index = 0; index < menuList.length; index++) {
                  // 如果catIds为空则全部生成项目所有的接口
                  if (!this.ids || !this.ids.length) {
                    this.add(menuList[index]);
                  } else {
                    if (menuList[index]._id == this.ids[i]) {
                      const { type } = await inquirer.prompt([
                        {
                          type: "list",
                          message: `请选择需要生成${menuList[index].name || menuList[index].desc}接口的文件(项目名:${projectName}(接口共${menuList[index].list.length}个))`,
                          name: "type",
                          choices: files,
                        },
                      ]);
                      selectName = type;
                      readFiles = fs.readFileSync(selectName, "utf-8");
                      paths = readFiles
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

                      if (menuList[index].list) {
                        // 如果当前文件里面没有内容，则生成当前下所有的api
                        if (!paths.length) {
                          this.add(menuList[index]);
                        } else {
                          menuList[index].list.forEach(async (item, lIndex) => {
                            console.log(
                              `正在生成第${this.curNum(lIndex + 1)}项...`
                            );

                            if (menuList[index].list.length - 1 == lIndex) {
                              console.log("生成完毕");
                            }
                            // 如果没有重复的项则生成
                            if (!paths.some((p) => item.path == p)) {
                              // 转为驼峰命名
                              const apiName = toCamelCase(item.path);
                              names.push(item.title);
                              apiNames.push(apiName.replace("\\", "/"));
                              totalApi.push(apiName.replace("\\", "/"));
                              apis.push(
                                setRequestTemplate({
                                  zhushi: item.title,
                                  method: item.method,
                                  apiName,
                                  url: this.getUrl(item._id).menuUrl,
                                  path: item.path,
                                })
                              );
                            }
                          });
                        }
                      }

                      break;
                    }
                  }
                }
              }
            }

            console.log(`\n接口已全部生成成功`);
            // 读取文件内容
            try {
              // 如果没有传则生成全部到一个文件里面
              if (!this.ids || !this.ids.length) {
                if (configs.projects.length - 1 == index) {
                  // 加入最前面的头部
                  apis.unshift(
                    setHeader(
                      !this.ids?.length ? "" : projectName,
                      /api\/(.*)$/
                        .exec(selectName.replaceAll("\\", "/"))[1]
                        .replace("src/", ""),
                      totalApi.join(","),
                      yapiUrl
                    )
                  );
                  console.log(`正在写入文件中...`);
                  fs.writeFileSync(
                    selectName,
                    await prettier.format(apis.join("\n"), {
                      parser: "babel",
                    }),
                    "utf8"
                  );
                  console.log("文件全部写入成功");
                }

                spinner.succeed(
                  `成功生成${projectName}项目(${names.length}个接口):`
                );
                console.log(`菜单标题:${names.join(",")}`);
                console.log(`生成接口名称:${apiNames.join(",")}`);
              } else {
                if (!readFiles) {
                  // 加入最前面的头部
                  apis.unshift(
                    setHeader(
                      !this.ids?.length ? "" : projectName,
                      /api\/(.*)$/
                        .exec(selectName.replaceAll("\\", "/"))[1]
                        .replace("src/", ""),
                      totalApi.join(","),
                      yapiUrl
                    )
                  );
                }
                console.log(
                  !paths.length ? `正在写入文件中...` : `正在更新文件中...`
                );
                // 在文件内容中查找匹配项并进行替换
                const regex = /import\s*\{\s*([a-zA-Z,]+)\s*\}/;
                readFiles = readFiles.replace(regex, (match, group) => {
                  // 在这里，group 就是大括号内的内容，你可以进行处理或替换
                  return `import {${[...new Set([...group.split(","), ...apiNames])].join(",")}}`;
                });

                // 同步写入修改后的内容
                fs.writeFileSync(selectName, readFiles, "utf8");
                fs.appendFileSync(
                  selectName,
                  await prettier.format(apis.join("\n"), {
                    parser: "babel",
                  })
                );
                console.log(!paths.length ? "文件写入成功" : `文件更新成功`);

                spinner.succeed(
                  `成功生成${projectName}项目(${names.length}个接口):`
                );
                console.log(`菜单标题:${names.join(",")}`);
                console.log(`生成接口名称:${apiNames.join(",")}`);
                apis = [];
              }
              apiNames = [];
              names = [];
              resolve();
            } catch (err) {
              console.error(`发生错误: ${err}`);
            }
          });
          yapiUrl = this.getUrl().indexUrl;
          await page.goto(yapiUrl);
        } catch (error) {
          console.log(error);
        }
      });
    }
    getData(url) {
      return new Promise((resolve, reject) => {
        page.on("response", async (response) => {
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
    add(data) {
      data.list?.forEach(async (item, lIndex) => {
        console.log(`正在生成第${this.curNum(lIndex + 1)}项...`);

        if (data.list.length - 1 == lIndex) {
          console.log("生成完毕");
        }
        // 转为驼峰命名
        const apiName = toCamelCase(item.path);
        apiNames.push(apiName.replace("\\", "/"));
        totalApi.push(apiName.replace("\\", "/"));
        names.push(item.title);
        apis.push(
          setRequestTemplate({
            zhushi: item.title,
            method: item.method,
            apiName,
            url: this.getUrl(item._id).menuUrl,
            path: item.path,
          })
        );
      });
    }
  }

  const yapi = new Yapi();
  configs.projects.reduce(async (promise, item, index) => {
    await promise;
    await yapi.init({ projectId: item.projectId, ids: item.catIds }, index);
    if (index == configs.projects.length - 1) {
      spinner.succeed(`接口已全部生成完毕:`);
      console.log(`总共生成${totalApi.length}个接口`);
      process.exit();
    }
  }, Promise.resolve());
})();
