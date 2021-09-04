import axios from 'axios'
import { getLogger, Logger } from 'log4js'

// axios
axios.defaults.timeout = 10000;

// log4js
const logger: Logger = getLogger('[kokkoro log]')
logger.level = 'all';

const cwd = process.cwd();
const uptime = process.uptime();
const platform = process.platform;

/**
 * 控制台彩色打印
 * 
 * @param code - ANSI escape code
 * @returns - function
 */
function color(code: number): Function {
  return (msg: string) => `\u001b[${code}m${msg}\u001b[0m`
}

const red = color(31);
const green = color(32);
const yellow = color(33);
const blue = color(34);
const magenta = color(35);
const cyan = color(36);
const white = color(37);

const info = cyan('Info:');
const error = red('Error:');
const warn = yellow('Warn:');
const success = green('Success:');

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
 * 发送图片（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * 
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function sendImage(url: string, flash: boolean = false): Promise<string | Error> {
  return new Promise(async (resolve, reject) => {
    // 判断是否为网络链接
    if (!/^https?/g.test(url)) return resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=${url}]`);

    await axios.get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        const base64: string = Buffer.from(response.data, 'binary').toString('base64');

        resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=base64://${base64}]`);
      })
      .catch((error: Error) => {
        reject(`Error: ${error.message}\n图片流写入失败，但已为你获取到图片地址:\n${url}`);
      })
  })
}

/**
 * 生成 at 字段 CQ 码
 * 
 * @param qq 
 * @returns 
 */
function at(qq: number): string {
  return `[CQ:at,qq=${qq}]`
}

export {
  axios, logger,
  cwd, uptime, platform,
  red, green, yellow, blue, magenta, cyan, white,
  info, error, warn, success,
  checkCommand, sendImage, at
}