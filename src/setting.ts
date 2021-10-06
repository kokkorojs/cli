import { resolve } from 'path'

import { cwd } from './util'
import { GlobalConfig, ISetting } from '..';
import { getConfig, parseCommandline } from './config';

const all_setting: Map<number, ISetting> = new Map();

try {
  const config: GlobalConfig = getConfig();
  const uins: string[] = Object.keys(config.bots);

  for (const uin of uins) {
    const path = resolve(cwd, `data/bots/${uin}/config.json`);

    all_setting.set(Number(uin), require(path))
  }
} catch { }

// #dregion 列出当前群聊插件设置
function getSetting() {
  return all_setting
}
// #endregion

// #dregion 写入群聊插件设置
async function setSetting(params: ReturnType<typeof parseCommandline>['params'], self_id: number, group_id: number): Promise<string> {
  if (!params[0]) return `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] || {}, null, 2)}`

  return 'setSetting'
}
// #endregion

// #dregion 获取群聊插件列表
async function getList(self_id: number, group_id: number): Promise<string> {
  const { setting } = all_setting.get(self_id)?.[group_id] || { setting: {} };
  const message = ['"list": {'];

  for (const key in setting) message.push(`  "${key}": ${setting[key].switch}`);

  message.push('}\n// 如要查看更多信息可输入 >setting');
  return message.join('\n');
}
// #endregion

export {
  getSetting, setSetting, getList
}