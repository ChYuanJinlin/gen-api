require("dotenv").config();
module.exports = {
  // yapi账户信息
  users: {
    email: process.env.email,
    password: process.env.password,
  },
  // yapi内网域名
  // domain: "https://yapi.gzgsy.cn",
  // 生成api的文件夹
  apiFilePath: "api",
  // 请求文件的路径
  importRequestName: "import request from '@/utils/request'",
  // 请求函数模板
  //   requestTemplate(opt) {
  //     return `
  // export function ${opt.apiName}(${opt.method == "POST" ? "data" : "query"}) {
  // return request({
  // url: '${opt.path}',
  // method:'${opt.method}',
  // ${opt.method == "POST" ? "data" : "params"}:  ${
  //       opt.method == "POST" ? "data" : "query"
  //     }
  //       })
  //     }

  //     `;
  //   },
  // yapi项目配置项
  projects: [
    {
      // yapi分类id 不填则生成项目下的全部接口
      catIds: [18584],
      // 项目id
      projectId: "3975",
    },
    {
      // yapi分类id 不填则生成项目下的全部接口
      catIds: [18444, 18574],
      // 项目id
      projectId: "3947",
    },
  ],
};
