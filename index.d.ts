import { Logger } from 'log4js';
import { Client, ConfBot } from "oicq";

interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 插件
  plugins: string[];
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: {
      // bot 主人
      masters: number[];
      // 自动登录
      auto_login: boolean;
      // 管理指令前缀，默认为 ">"
      prefix: string;
      // 1-5
      platform: ConfBot["platform"];
      // off, error ,warn, info, debug, trace
      log_level: ConfBot["log_level"];
    }
  }
}

interface ISetting {
  // 插件锁定
  lock: boolean;
  // 插件开关
  switch: boolean;
  // 其它设置
  [param: string]: any;
}

interface IConfig {
  // 插件列表
  plugin: string[];
  [group_id: number]: {
    name: string;
    setting: {
      [plugin_name: string]: ISetting
    }
  }
}