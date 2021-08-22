import { getLogger, Logger } from 'log4js'

const logger: Logger = getLogger('[kokkoro bot log]')
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

export {
  logger,
  cwd, uptime, platform,
  red, green, yellow, blue, magenta, cyan, white,
  info, error, warn, success,
  checkCommand,
}