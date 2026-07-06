const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'routes', 'organized.routes.js');
if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!src.includes('groups: groups.map')) {
    src = src.replace(
      "const bracket = await storage.writeBracket({\n        slotSize: generated.slotSize,\n        teamLimit: limit,\n        eventId: settings.activeEventId || '',\n        slots: generated.slots,\n        round16: generated.round16,",
      "const bracket = await storage.writeBracket({\n        slotSize: generated.slotSize,\n        teamLimit: limit,\n        eventId: settings.activeEventId || '',\n        slots: generated.slots,\n        round16: generated.round16,\n        groups: groups.map((group) => ({ name: group.name, teams: (group.teams || []).map((team) => team.id).filter(Boolean) })),"
    );
    changed = true;
  }

  if (changed) fs.writeFileSync(file, src, 'utf8');
}

console.log('Patch aplicado: grupos do chaveamento persistem no backend.');
