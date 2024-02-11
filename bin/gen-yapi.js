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
const apiNames = [];
// 接口所有的描述
const names = [];
// 总项
let total = 0;
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
const apis = [];
let browser = null;
let page = null;
let spinner = null;
getFilenames(
  path.join(process.cwd(), "src/" + configs.apiFilePath || "src/api"),
  (filename) => {
    files.push(filename);
  }
);

const setHeader = (desc, path, apiNames, url) => {
  return `/* 
@描述: ${desc} 
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
@描述: ${opt.zhushi} 
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
    // devtools: true,
    // slowMo: 100,
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

    init(opt) {
      return new Promise(async (resolve, reject) => {
        this.projectId = opt.projectId;
        this.ids = opt.ids;

        try {
          let yapiUrl = "",
            paths = "",
            readFiles;

          if (!this.ids.length || !this.ids) {
            yapiUrl = this.getUrl().indexUrl;
            await page.goto(yapiUrl);
            const res = await getRes(
              page,
              domain + `/api/interface/list_menu?project_id=${this.projectId}`,
              spinner
            );
            const menuList = res.data;
            spinner.stop();
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
              yapiUrl = this.getUrl(this.ids[i]).projectUrl;
              await page.goto(yapiUrl);
              const res = await getRes(
                page,
                domain +
                  `/api/interface/list_menu?project_id=${this.projectId}`,
                spinner
              );
              const projectName = await page.$eval(
                "#yapi > div > div.router-main > div.header-box.m-header.ant-layout-header > div > div.breadcrumb-container > div > span:nth-child(2) > span.ant-breadcrumb-link",
                (el) => el.innerText
              );
              const menuList = res.data;
              spinner.stop();
              for (let index = 0; index < menuList.length; index++) {
                // 如果catIds为空则全部生成项目所有的接口
                if (!this.ids.length || !this.ids) {
                  this.add(menuList[index]);
                } else {
                  if (menuList[index]._id == this.ids[i]) {
                    const { type } = await inquirer.prompt([
                      {
                        type: "list",
                        message: `请选择需要生成${menuList[index].name || menuList[index].desc}接口的文件(项目名:${projectName})`,
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
                          if (!total) {
                            total = menuList[index].list.length;
                            console.log(
                              `全部接口共${menuList[index].list.length}项\n`
                            );
                          }
                          if (menuList[index].list.length - 1 == lIndex) {
                            total = 0;
                          }
                          console.log(
                            `正在生成第${this.curNum(lIndex + 1)}项...`
                          );
                          // 如果没有重复的项则生成
                          if (!paths.some((p) => item.path == p)) {
                            // 转为驼峰命名
                            const apiName = toCamelCase(item.path);
                            names.push(
                              menuList[index].name || menuList[index].desc
                            );
                            apiNames.push(apiName.replace("\\", "/"));
                            apis.push(
                              setRequestTemplate({
                                projectName:
                                  menuList[index].name || menuList[index].desc,
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
          if (!paths.length || !this.ids) {
            // 加入最前面的头部
            apis.unshift(
              setHeader(
                "",
                /api\/(.*)$/
                  .exec(selectName.replaceAll("\\", "/"))[1]
                  .replace("src/", ""),
                apiNames.join(","),
                yapiUrl
              )
            );
          }
          console.log(`\n接口已全部生成成功`);
          // 读取文件内容
          try {
            // 如果没有传则生成全部到一个文件里面
            if (!this.ids.length) {
              console.log(`正在写入文件中...`);
              fs.writeFileSync(
                selectName,
                await prettier.format(apis.join("\n"), {
                  parser: "babel",
                }),
                "utf8"
              );
              console.log("文件写入成功");
            } else {
              console.log(
                !paths.length ? `正在写入文件中...` : `正在更新文件中...`
              );
              // 在文件内容中查找匹配项并进行替换
              const regex = /import\s*\{\s*([a-zA-Z,]+)\s*\}/;
              readFiles = readFiles.replace(regex, (match, group) => {
                // 在这里，group 就是大括号内的内容，你可以进行处理或替换
                return `import {${[...group.split(","), ...apiNames].join(",")}}`;
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
            }

            spinner.succeed(
              `成功生成:\n${names.join(",")}总共${apiNames.length}个接口`
            );
            resolve();
          } catch (err) {
            console.error(`发生错误: ${err}`);
          }
        } catch (error) {
          console.log(error);
        }
      });
    }
    add(data) {
      data.list?.forEach(async (item, lIndex) => {
        if (!total) {
          total = data.list.length;
          console.log(`全部接口共${data.list.length}项\n`);
        }
        if (data.list.length - 1 == lIndex) {
          total = 0;
        }
        console.log(`正在生成第${this.curNum(lIndex + 1)}项...`);
        // 转为驼峰命名
        const apiName = toCamelCase(item.path);
        apiNames.push(apiName.replace("\\", "/"));
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
    await yapi.init({ projectId: item.projectId, ids: item.catIds });
    if (index == configs.projects.length - 1) {
      process.exit();
    }
  }, Promise.resolve());
})();
