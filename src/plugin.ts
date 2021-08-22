import { join } from 'path'
import { Client } from 'oicq'
import { Dirent } from 'fs'
import { readFile, writeFile, readdir, mkdir } from 'fs/promises'

import { cwd } from './util'
import { ISetting } from '..'

// 所有插件实例
const plugins = new Map<string, Plugin>()

class PluginError extends Error {
  name = "PluginError"
}

class Plugin {
  protected readonly fullpath: string;
  readonly binds = new Set<Client>();

  constructor(protected readonly name: string, protected readonly path: string) {
    this.fullpath = require.resolve(this.path);
    require(this.path);
  }

  protected async _editBotPluginCache(bot: Client, method: 'add' | 'delete') {
    const dir = join(bot.dir, 'setting');
    let setting: ISetting;
    let set: Set<string>;

    try {
      setting = JSON.parse(await readFile(dir, { encoding: 'utf8' }));
      set = new Set(setting.plugins);
    } catch {
      setting = { plugins: [] };
      set = new Set;
    }

    set[method](this.name);
    setting.plugins = [...set];

    return writeFile(dir, JSON.stringify(setting, null, 2));
  }

  async enable(bot: Client) {
    if (this.binds.has(bot)) {
      throw new PluginError("这个机器人实例已经启用了此插件");
    }
    const mod = require.cache[this.fullpath];

    if (typeof mod?.exports.enable !== "function") {
      throw new PluginError("此插件未导出 enable 方法，无法启用。");
    }
    try {
      const res = mod?.exports.enable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "add");
      this.binds.add(bot);
    } catch (e) {
      throw new PluginError(`启用插件时遇到错误。\n错误信息：${e.message}`);
    }
  }

  async disable(bot: Client) {
    if (!this.binds.has(bot)) {
      throw new PluginError(`这个机器人实例尚未启用此插件`);
    }

    const mod = require.cache[this.fullpath];

    if (typeof mod?.exports.disable !== "function") {
      throw new PluginError(`此插件未导出 disable 方法，无法禁用。`);
    }
    try {
      const res = mod?.exports.disable(bot);

      if (res instanceof Promise) await res;

      await this._editBotPluginCache(bot, "delete");
      this.binds.delete(bot);
    } catch (e) {
      throw new PluginError(`禁用插件时遇到错误。\n错误信息：${e.message}`)
    }
  }

  async goDie() {
    const mod = require.cache[this.fullpath] as NodeModule;

    try {
      for (let bot of this.binds) {
        await this.disable(bot);
      }
      if (typeof mod.exports.destroy === "function") {
        const res = mod.exports.destroy();

        if (res instanceof Promise) await res;
      }
    } catch { }

    const ix = mod.parent?.children?.indexOf(mod) as number;

    if (ix >= 0) mod.parent?.children.splice(ix, 1);

    for (const fullpath in require.cache) {
      if (require.cache[fullpath]?.id.startsWith(mod.path)) delete require.cache[fullpath];
    }

    delete require.cache[this.fullpath];
  }

  async reboot() {
    try {
      const binded = Array.from(this.binds);

      await this.goDie();
      require(this.path);

      for (let bot of binded) await this.enable(bot);
    } catch (e) {
      throw new PluginError(`重启插件时遇到错误。\n错误信息：${e.message}`);
    }
  }
}

/**
 * 导入插件
 * 
 * @param name - 插件名
 * @returns - Plugin 对象
 * @throws {Error}
 */
async function importPlugin(name: string): Promise<Plugin> {
  // 加载本地插件
  if (plugins.has(name)) return plugins.get(name) as Plugin

  let resolved = "";
  const files = await readdir(join(cwd, '/plugins'), { withFileTypes: true });

  for (let file of files) {
    if ((file.isDirectory() || file.isSymbolicLink()) && file.name === name) {
      resolved = join(cwd, '/plugins', name)
    }
  }
  // 加载 npm 插件
  if (!resolved) {
    const modules = await readdir(join(cwd, '/node_modules'), { withFileTypes: true });

    for (let file of modules) {
      if (file.isDirectory() && (file.name === name || file.name === "kokkoro-plugin-" + name)) {
        resolved = file.name
      }
    }
  }

  if (!resolved) throw new PluginError(`插件名错误，无法找到此插件`)

  try {
    const plugin = new Plugin(name, resolved)
    plugins.set(name, plugin)
    return plugin
  } catch (e) {
    throw new PluginError(`导入插件失败，不合法的 package\n错误信息：${e.message}`);
  }
}

/**
 * 校验导入插件
 * @param name - 插件名
 * @returns - Plugin 对象
 */
function checkImported(name: string): Plugin {
  if (!plugins.has(name)) {
    throw new PluginError("尚未安装此插件")
  }

  return plugins.get(name) as Plugin
}

/**
 * 卸载插件
 * 
 * @param name - 插件名
 * @throws {Error}
 */
async function deletePlugin(name: string): Promise<void> {
  await checkImported(name).goDie();

  plugins.delete(name);
}

/**
 * 重启插件
 * 
 * @param name - 插件名
 * @throws {Error}
 * @returns - void
 */
function rebootPlugin(name: string): Promise<void> {
  return checkImported(name).reboot();
}

/**
 * 启用插件
 * 
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 */
async function enable(name: string, bot: Client): Promise<void> {
  const plugin = await importPlugin(name);

  return plugin.enable(bot);
}

/**
 * 禁用插件
 * 
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 * @throws {Error}
 */
function disable(name: string, bot: Client): Promise<void> {
  return checkImported(name).disable(bot)
}

/**
 * 禁用所有插件
 * 
 * @param bot - bot 实例
 * @returns - void
 */
async function disableAll(bot: Client): Promise<void> {
  for (let [_, plugin] of plugins) {
    try {
      await plugin.disable(bot);
    } catch { }
  }
}

/**
 * 查找所有可用插件
 * @throws {Error}
 */
async function findAllPlugins() {
  const plugin_modules: string[] = [];
  const node_modules: string[] = [];
  const files: Dirent[] = [];

  try {
    files.push(...await readdir(join(cwd, `/plugins`), { withFileTypes: true }))
  } catch (error) {
    await mkdir(join(cwd, `/plugins`));
  }

  for (let file of files) {
    if (file.isDirectory() || file.isSymbolicLink()) {
      try {
        require.resolve(`${cwd}/plugins/` + file.name);
        plugin_modules.push(file.name);
      } catch { }
    }
  }

  const modules: Dirent[] = [];

  try {
    modules.push(...await readdir(join(cwd, '/node_modules'), { withFileTypes: true }));
  } catch (error) {
    await mkdir(join(cwd, `/node_modules`));
  }

  for (let file of modules) {
    if (file.isDirectory() && file.name.startsWith("kokkoro-plugin-")) {
      try {
        require.resolve(file.name);
        node_modules.push(file.name);
      } catch { }
    }
  }

  return {
    plugin_modules, node_modules, plugins
  }
}

/**
 * bot 启动后恢复它原先绑定的插件
 * 
 * @param bot - bot 实例
 * @returns Map<string, Plugin>
 */
async function restorePlugins(bot: Client): Promise<Map<string, Plugin>> {
  const dir = join(bot.dir, 'setting');

  try {
    const setting: ISetting = JSON.parse(await readFile(dir, { encoding: 'utf8' }));

    for (let name of setting.plugins) {
      try {
        const plugin = await importPlugin(name);

        await plugin.enable(bot);
      } catch { }
    }
  } catch { }

  return plugins
}

export {
  deletePlugin, rebootPlugin, enable, disable, disableAll, findAllPlugins, restorePlugins
}