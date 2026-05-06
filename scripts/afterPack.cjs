const fs = require('fs');
const path = require('path');

const KEEP_LOCALES = new Set(['en-US.pak', 'zh-CN.pak']);

module.exports = async function afterPack(context) {
  const localesDir = path.join(context.appOutDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  for (const entry of fs.readdirSync(localesDir)) {
    if (!entry.endsWith('.pak') || KEEP_LOCALES.has(entry)) continue;
    fs.rmSync(path.join(localesDir, entry), { force: true });
  }
};
