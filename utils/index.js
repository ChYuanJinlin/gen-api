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
    return await page.waitForResponse(async (res) => {
      if (res.url() === url && res.status() === 200) {
        const loginRes = await res.json();
        if (loginRes.errcode != 0) {
          spinner.fail(loginRes.errmsg);
          process.exit();
        }
        return loginRes;
      }else {
        return false
      }
    });
  },
};
