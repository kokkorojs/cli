import { resolve } from 'path'
import { ConfBot } from 'oicq'
import { writeFile } from 'fs/promises'

import { cwd } from './util'
import { GlobalConfig } from '..'

const path = resolve(cwd, 'kokkoro.config.js');
const config: GlobalConfig = require(path);

function getConfig() {
  return config
}

function writeConfig() {
  return writeFile(path, `module.exports = ${JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, '$1:')}`);
}

async function addBot(uin: number, master: number) {
  const bots = config.bots;

  bots[uin] = {
    masters: [master], autologin: true, prefix: '>', platform: 5, log_level: 'info'
  }

  await writeConfig();
}

async function openAutoLogin(self_id: number) {
  config.bots[self_id].autologin = true;

  await writeConfig();
  return `Success: 已开启账号自动登录`
}

async function closeAutoLogin(self_id: number) {
  config.bots[self_id].autologin = false;

  await writeConfig();
  return `Success: 已关闭账号自动登录`
}

async function addMaster(uin: number, self_id: number) {
  const masters = new Set(config.bots[self_id].masters);

  if (!masters.has(uin)) {
    masters.add(uin);
    config.bots[self_id].masters = Array.from(masters);

    await writeConfig();
  }
  return `Success：当前 master 列表：${config.bots[self_id].masters}`
}

async function deleteMaster(uin: number, self_id: number) {
  const masters = new Set(config.bots[self_id].masters);

  if (!masters.has(uin)) {
    return `Error: ${uin} is not defined`
  }

  masters.delete(uin);
  config.bots[self_id].masters = Array.from(masters);

  await writeConfig();
  return `Success: 当前 master 列表：${config.bots[self_id].masters}`
}

async function setPrefix(prefix: string, self_id: number) {
  if (prefix) {
    const old_prefix = config.bots[self_id].prefix;
    config.bots[self_id].prefix = prefix;

    await writeConfig();
    return `Success: prefix '${old_prefix}' >>> '${config.bots[self_id].prefix}'`
  } else {
    return `Error: prefix 至少需要一个字符`
  }
}

async function setDefaultPlatform(platform: number, self_id: number) {
  const params = [1, 2, 3, 4, 5];

  if (!params.includes(platform)) return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`

  const old_platform = config.bots[self_id].platform;
  config.bots[self_id].platform = platform;

  await writeConfig();
  return `Success: platform ${old_platform} >>> ${config.bots[self_id].platform}`
}

async function setDefaultLogLevel(log_level: ConfBot['log_level'], self_id: number) {
  const params = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark', 'off', undefined];

  if (!params.includes(log_level)) return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`

  const old_log_level = config.bots[self_id].log_level;
  config.bots[self_id].log_level = log_level;

  await writeConfig();
  return `Success: log_level '${old_log_level}' >>> '${config.bots[self_id].log_level}'`
}


async function setConfig(params: ReturnType<typeof parseCommandline>['params'], self_id: number) {
  if (!params[0]) return `当前 bot 全局配置：\n${JSON.stringify(config.bots[self_id], null, 2)}`

  let ret: string;
  try {
    switch (params[0]) {
      case 'opn-al':
        ret = await openAutoLogin(self_id);
        break;

      case 'cls-al':
        ret = await closeAutoLogin(self_id);
        break;

      case 'add-mst':
        ret = await addMaster(Number(params[1]), self_id);
        break;

      case 'del-mst':
        ret = await deleteMaster(Number(params[1]), self_id);
        break;

      case 'prefix':
        ret = await setPrefix(params[1], self_id);
        break;

      case 'platform':
        ret = await setDefaultPlatform(Number(params[1]), self_id);
        break;

      case 'log_level':
        ret = await setDefaultLogLevel(params[1] as ConfBot['log_level'], self_id);
        break;

      default:
        ret = `Error：未知参数：${params[0]}`;
        break;
    }
  } catch {
    ret = 'Error：default-config.json 写入失败，请检查是否被其它程序占用';
  }

  return ret;
}

function parseCommandline(commandline: string) {
  const split = commandline.split(' ');
  let cmd = '', params: string[] = [];

  for (let val of split) {
    if (val === '')
      continue
    if (!cmd)
      cmd = val
    else
      params.push(val)
  }
  return {
    cmd, params
  }
}

export {
  getConfig, setConfig, parseCommandline, addBot
}