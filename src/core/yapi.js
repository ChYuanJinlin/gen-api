module.exports = class Yapi extends Generator {
  constructor(config) {
    super(config);
    // 默认域名
    this.config.domain =
      this.config.domain.replace(/\/$/, "") || "http://api.doc.jiyou-tech.com";
  }
  getUrl(catId) {
    return {
      projectUrl:
        this.config.domain +
        `/project/${this.projectId}/interface/api/cat_${catId}`,
      menuUrl:
        this.config.domain +
        `/project/${this.projectId}/interface/api/${catId}`,
      indexUrl: this.config.domain + `/project/${this.projectId}/interface/api`,
    };
  }

  async init(opt, index) {
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(0);
    // yapi登录地址
    await this.page.goto(this.config.domain + "/login");
    await this.page.waitForSelector("#email", {
      timeout: 0,
    });
    try {
      // 输入账号密码
      await this.page.type("#email", this.userName);
      await this.page.type("#password", this.passWord);
      await this.page.keyboard.press("Enter");
      await this.request(this.config.domain + "/api/user/login");
      const c = await this.page.cookies();
      this.cookies = c.map((item) => ({ name: item.name, value: item.value }));
      await this.page.setCookie(...this.cookies);
    } catch (error) {
      this.spinner.fail("生成失败");
      throw new Error(error);
    }
    return new Promise(async (resolve, reject) => {
      const res = await this.page.goto(
        this.config.domain + `/api/project/get?id=${opt.projectId}`
      );

      const data = await res.json();

      if (data.errcode == 40011) {
        this.spinner.fail(`该项目ID${opt.projectId}不存在,请检查projectId`);
        process.exit();
      }

      this.opt = opt;
      this.catIds = opt.catIds;
      this.projectId = opt.projectId;
      this.index = index;
      if (opt.catIds && Array.isArray(opt.catIds)) {
        const oldCatIds =
          this.apiDataJson[this.cacheKey.name]?.[index]?.ids || [];
        this.catIds = opt.catIds.filter((item) => !oldCatIds.includes(item));
        if (!this.catIds.length) {
          resolve();
          return false;
        }
      } else {
        if (
          this.apiDataJson[this.cacheKey.name]?.[index] &&
          this.apiDataJson[this.cacheKey.name][index].pid
        ) {
          resolve();
          return false;
        }
      }
      // 判单当前是否选过文件,如果选过文件把当前选过的文件加载第一项
      if (this.selectName) {
        this.files = [...new Set([this.selectName, ...this.files])];
      }
      try {
        // 监听当前接口返回数据
        this.getData(
          `${this.config.domain}/api/interface/list_menu?project_id=${opt.projectId}`
        ).then(async (menuList) => {
          this.spinner.stop();
          await this.page.waitForSelector(
            "#yapi > div > div.router-main > div.header-box.m-header.ant-layout-header > div > div.breadcrumb-container > div > span:nth-child(2) > span.ant-breadcrumb-link",
            {
              timeout: 0,
            }
          );

          this.projectName = await this.page.$eval(
            "#yapi > div > div.router-main > div.header-box.m-header.ant-layout-header > div > div.breadcrumb-container > div > span:nth-child(2) > span.ant-breadcrumb-link",
            (el) => el.innerText
          );
          this.projectNames.push(`${this.projectName}(${this.apiUrl})`);
          // 判断当前数组里面是否都是string类型或者是number类型
          if (
            this.config.projects.every(
              (item) => typeof item === "string" || typeof item === "number"
            )
          ) {
            this.selectName = "";
            for (let mIndex = 0; mIndex < menuList.length; mIndex++) {
              if (!this.selectName) {
                await this.gen("请选择需要生成所有接口的文件");
              }
              (await this.gen()).add(menuList[mIndex]);
            }
          } else {
            if (!this.opt.catIds) {
              const res = await this.page.goto(
                this.config.domain +
                  `/api/interface/list?this.page=1&limit=999999&project_id=${opt.projectId}`
              );
              menuList = (await res.json()).data;
              (
                await this.gen(
                  `请选择需要生成${this.projectName}项目接口文件((接口共${menuList.list.length}个))`
                )
              ).add(menuList, true);
            } else {
              const ids = menuList.map((item) => item._id);
              const noIds = this.catIds.filter((item) => !ids.includes(item));
              noIds.some((item) => {
                this.spinner.warn(
                  `${item}分类id不存在,请检查该分类id是否在该项目`
                );
                process.exit();
              });

              for (let i = 0; i < this.catIds.length; i++) {
                for (let index = 0; index < menuList.length; index++) {
                  if (menuList[index]._id == this.catIds[i]) {
                    const { add } = await this.gen(
                      `请选择需要生成${menuList[index].name || menuList[index].desc}接口的文件(项目名:${this.projectName}(接口共${menuList[index].list.length}个))`
                    );

                    if (menuList[index].list) {
                      add(menuList[index], true);
                    }
                    break;
                  }
                }
              }
            }
          }
          console.log(`\n接口已全部生成成功`);

          try {
            await this.writeHeader().writeApi();
            resolve();
          } catch (err) {
            console.error(`发生错误: ${err}`);
          }
        });
        this.apiUrl = this.getUrl().indexUrl;
        await this.page.goto(this.apiUrl);
      } catch (error) {
        console.log(error);
      }
    });
  }
};
