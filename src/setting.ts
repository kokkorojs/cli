import { resolve } from 'path'

import { cwd } from './util'
import { GlobalConfig, ISetting } from '..';
import { getConfig, parseCommandline } from './config';

const setting: Map<number, ISetting> = new Map();

try {
  const config: GlobalConfig = getConfig();
  const uins: string[] = Object.keys(config.bots);

  for (const uin of uins) {
    const path = resolve(cwd, `data/bots/${uin}/config.json`);

    setting.set(Number(uin), require(path))
  }
} catch { }

// #dregion 列出当前群聊插件设置
function getSetting() {
  return setting
}
// #endregion

// #dregion 写入群聊插件设置
async function setSetting(params: ReturnType<typeof parseCommandline>['params'], self_id: number, group_id: number): Promise<string> {
  if (!params[0]) return `"${group_id}" ${JSON.stringify(setting.get(self_id)?.[group_id], null, 2)}`

  return 'setSetting'
}
// #endregion

export {
  getSetting, setSetting
}