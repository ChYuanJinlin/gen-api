/* 
@项目名称:  
@地址:http://api.doc.jiyou-tech.com/project/3947/interface/api
引入:import {Test,Dasdsa,Tesdas,Hgh} from '@/api/index.js'
*/
import request from "@/utils/request";

/* 
@菜单名称: 测试yapi 
@地址:http://api.doc.jiyou-tech.com/project/3947/interface/api/57158
*/
export function Test(query) {
  return request({
    url: "/test",
    method: "GET",
    params: query,
  });
}

/* 
@菜单名称: dsasdas 
@地址:http://api.doc.jiyou-tech.com/project/3947/interface/api/57163
*/
export function Dasdsa(query) {
  return request({
    url: "/dasdsa",
    method: "GET",
    params: query,
  });
}

/* 
@菜单名称: 测试更新接口 
@地址:http://api.doc.jiyou-tech.com/project/3947/interface/api/57173
*/
export function Tesdas(query) {
  return request({
    url: "/tesdas",
    method: "GET",
    params: query,
  });
}

/* 
@菜单名称: ghjh 
@地址:http://api.doc.jiyou-tech.com/project/3947/interface/api/57558
*/
export function Hgh(query) {
  return request({
    url: "/hgh",
    method: "GET",
    params: query,
  });
}
