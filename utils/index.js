/*
 * @Author: 袁金林 yuanjinlin@guishangyi.cn
 * @Date: 2024-01-29 10:20:13
 * @LastEditors: yuanjinlin 1075360356@qq.com
 * @LastEditTime: 2024-02-11 15:09:47
 * @FilePath: \课件d:\qianduan\gen-yapi\utils\index.js
 * @Description:
 *
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved.
 */
const fs = require("fs");
const path = require("path");

module.exports = {
  getFilenames(dir, callback) {
    function ensureDirectoryExistence(filePath) {
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath);
        fs.writeFileSync(path.join(filePath, "index.js"), "");
      }
    }
    ensureDirectoryExistence(dir);
    fs.readdir(dir, (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        let fullPath = path.join(dir, file);
        fs.stat(fullPath, (err, stats) => {
          if (err) throw err;
          if (stats.isDirectory()) {
            getFilenames(fullPath, callback);
          } else {
            callback(fullPath);
          }
        });
      });
    });
  },
  toCamelCase(str) {
    return str.replace(/([/_][a-z])/g, (group) =>
      group.toUpperCase().replace("/", "").replace("_", "")
    );
  },
  async getRes(page, url, spinner) {
    return new Promise(async (resovle, reject) => {
      const res = await page.waitForResponse(async (res) => {
        if (res.url() === url && res.status() === 200) {
          const loginRes = await res.json();
          if (loginRes.errcode != 0) {
            spinner.fail(loginRes.errmsg);
            // process.exit();
          }
          return loginRes;
        }
      });
      resovle(res.json());
    });
  },
};
