import { Logger } from 'log4js';
import { Client, Config } from "oicq";

interface GlobalConfig {
  // 服务端口
  port: number;
  // bot 插件
  plugins: string[];
  // bot 信息
  bots: {
    // uin 账号
    [uin: number]: {
      // 指令前缀，默认为 '>'
      prefix: string;
      // 自动登录，默认 true
      auto_login: boolean;
      // 登录模式，默认 qrcode
      login_mode: 'qrcode' | 'password';
      // bot 主人
      masters: number[];
      // 登录配置
      config: Config;
    }
  }
}

interface IGroup {
  name: string;
  plugin: {
    [plugin_name: string]: {
      // 插件锁定
      lock: boolean;
      // 插件开关
      switch: boolean;
      // 其它设置
      [param: string]: string | number | boolean;
    }
  }
}

interface ISetting {
  // 插件列表
  all_plugin: string[];
  // 群聊列表
  [group_id: number]: IGroup
}