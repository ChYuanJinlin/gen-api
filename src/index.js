const path = require("path");
require("./utils/Generator");
const Yapi = require(path.join(__dirname,'core/yapi'));

module.exports = class GenApi {
  constructor() {}
  static createGenApi(config) {
    this.genApiName = config.genApiName;
    switch (this.genApiName) {
      case "yapi":
        return new Yapi(config);
      default:
        break;
    }
  }
};
