const fs = require("fs");
const path = require("path");

const getFilenames = (dir, callback) => {
  
  function ensureDirectoryExistence(filePath) {

    if (!fs.existsSync(filePath)) {
     console.log('文件夹不存在'+filePath);
     process.exit()
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
};

const createfolderFile = (_path, data) => {
  const paths = _path.split("/");
  paths.forEach((file, index) => {
    // 如果为true 证明是文件
    if (/\w\.\w/g.test(file)) {
      fs.writeFileSync(
        path.join(
          process.cwd(),
          "src",
          _path.slice(0, _path.indexOf(file)) + file
        ),
        data,
        "utf8"
      );
    } else {
      if (
        fs.existsSync(
          path.join(
            process.cwd(),
            "src",
            _path.slice(0, _path.indexOf(file)) + file
          )
        )
      ) {
        console.log("文件已存在");
        process.exit();
      }
      fs.mkdirSync(
        path.join(
          process.cwd(),
          "src",
          _path.slice(0, _path.indexOf(file)) + file
        )
      );
    }

   
  });
};

module.exports = {
  getFilenames,
  createfolderFile,
  toCamelCase(str) {
    return str.replace(/([/_-][a-z])/g, (group) =>
      group.toUpperCase().replaceAll(/\/|_|-/g, "")
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
      } else {
        return false;
      }
    });
  },
  getFileData(...args) {
    return args.map((_path) => {
      return fs.readFileSync(path.join(process.cwd(), _path), "utf-8");
    });
  },
};
