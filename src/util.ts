import axios from 'axios';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync'
import schedule from 'node-schedule';
import { getLogger, Logger } from 'log4js';

// axios
axios.defaults.timeout = 10000;

/**
 * 目前 lowdb 版本为 1.0.0 ，因为 2.x 开始就不再支持 commonjs ，node 对于 ems 的支持又不太友好 orz
 * 相关 README 说明: https://github.com/typicode/lowdb/blob/a0048766e75cec31c8d8b74ed44fc1a88284a493/README.md
 */
const lowdb = {
  low, FileSync
}

// log4js
const logger: Logger = getLogger('[kokkoro log]');

const cwd = process.cwd();
const uptime = process.uptime();
const platform = process.platform;

//#region colorful

/**
 * @description 控制台彩色打印
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}

//#endregion

const colors = {
  red: colorful(31), green: colorful(32), yellow: colorful(33),
  blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};

const tips = {
  info: colors.cyan('Info:'), error: colors.red('Error:'),
  warn: colors.yellow('Warn:'), success: colors.green('Success:'),
};

/**
 * 校验指令
 * 
 * @param command - 指令对象
 * @param raw_message - 收到的消息
 * @returns - 返回 command 对象匹配的方法名
 */
function checkCommand(command: { [key: string]: RegExp }, raw_message: string): string | undefined {
  const keys = Object.keys(command);
  const key_length = keys.length;

  for (let i = 0; i < key_length; i++) {
    const key = keys[i];

    if (!command[key].test(raw_message)) continue

    return key
  }
}

/**
 * @description 生成图片 CQ 码（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function image(url: string, flash: boolean = false): Promise<string | Error> {
  return new Promise(async (resolve, reject) => {
    // 判断是否为网络链接
    if (!/^https?/g.test(url)) return resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=${url}]`);

    await axios.get(url, { responseType: 'arraybuffer' })
      .then(response => {
        const base64: string = Buffer.from(response.data, 'binary').toString('base64');

        resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=base64://${base64}]`);
      })
      .catch((error: Error) => {
        reject(`Error: ${error.message}\n图片流写入失败，但已为你获取到图片地址:\n${url}`);
      })
  })
}

/**
 * @description 生成 at 成员 CQ 码
 * @param qq 
 * @returns 
 */
function at(qq: number): string {
  return `[CQ:at,qq=${qq}]`
}

export {
  axios, logger, schedule, lowdb,
  cwd, uptime, platform, colors, tips,
  at, image, checkCommand,
}