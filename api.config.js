module.exports = {
  // api账户信息
  users: {
    userName: "",
    passWord: "",
  },
  // 需要生成在线文档的网站
  genApiName: "",
  // api内网域名
  domain: "",
  // 生成api的文件夹
  // apiFilePath: "api",
  // 自定义apiName函数名
  // getRequestFunctionName(apiName) {

  // },
  // 请求文件的路径
  // importRequestName: "",
  /*   {
    函数入参参数 可以函数配置
    paramsName:'',
    注释
    annotation:'',
    自定义的请求函数
    requestFunc:
  } */
  // requestOpt: {
  
  // },
  // api项目配置项
  // 配置选项:如果传的是{catIds:xxx,projectId:xxx}生成不同的分类接口，如果要生成当前项目下所有的接口只需要传项目id过来即可 projectId 是必填项
  projects: [],
};
