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
      autologin: boolean;
      // 管理指令前缀，默认为 ">"
      prefix: string;
      // 1-5
      platform: ConfBot["platform"];
      // off,error,warn,info,debug,trace
      log_level: ConfBot["log_level"];
    }
  }
}

interface ISetting {
  plugins: string[];
  [group_id: number]: {
    name: string;
    settings: {
      [plugin: string]: {
        lock: boolean;
        switch: boolean;
        [param: string]: any;
      }
    }
  }
}